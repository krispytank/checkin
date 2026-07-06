#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Mahakama Access Production Deploy Script
# ============================================
# Usage:
#   ./deploy.sh              Check for updates and deploy if newer version found
#   ./deploy.sh --force      Deploy even if version hasn't changed
#   ./deploy.sh --rollback <version>  Rollback to a specific version
#   ./deploy.sh --status     Show current version and check for updates
#   ./deploy.sh --version    Print current version
# ============================================

APP_DIR="/opt/attendtrack"
VERSION_FILE="$APP_DIR/VERSION"
LOG_DIR="$APP_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
GITHUB_REPO="krispytank/Attendance"  # Update with your GitHub repo
HEALTH_URL="http://localhost:3000/api/health"
MAX_HEALTH_RETRIES=5
HEALTH_RETRY_DELAY=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  local level=$1
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${timestamp} [${level}] ${message}" | tee -a "$DEPLOY_LOG"
}

info()    { log "INFO" "${BLUE}$*${NC}"; }
success() { log "OK"   "${GREEN}$*${NC}"; }
warn()    { log "WARN" "${YELLOW}$*${NC}"; }
error()   { log "ERROR" "${RED}$*${NC}"; }

get_current_version() {
  if [[ -f "$VERSION_FILE" ]]; then
    cat "$VERSION_FILE" | tr -d '[:space:]'
  else
    echo "0.0.0"
  fi
}

get_latest_release() {
  # Fetch latest release tag from GitHub API
  local latest
  latest=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"v?([^"]+)".*/\1/' 2>/dev/null || echo "")
  echo "$latest"
}

check_connection() {
  if ! curl -s --connect-timeout 5 "https://api.github.com" > /dev/null 2>&1; then
    error "Cannot reach GitHub. Check internet connection."
    exit 1
  fi
}

health_check() {
  info "Running health check..."
  local attempt=1
  while [[ $attempt -le $MAX_HEALTH_RETRIES ]]; do
    if curl -s --connect-timeout 3 "$HEALTH_URL" | grep -q '"status":"ok"'; then
      success "Health check passed (attempt $attempt/$MAX_HEALTH_RETRIES)"
      return 0
    fi
    warn "Health check failed (attempt $attempt/$MAX_HEALTH_RETRIES), retrying in ${HEALTH_RETRY_DELAY}s..."
    sleep $HEALTH_RETRY_DELAY
    ((attempt++))
  done
  error "Health check failed after $MAX_HEALTH_RETRIES attempts"
  return 1
}

save_version() {
  echo "$1" > "$VERSION_FILE"
}

pull_and_build() {
  local target_version="$1"

  info "Pulling code from GitHub..."
  cd "$APP_DIR"

  # Stash any local changes
  git stash --include-untracked 2>/dev/null || true

  # Fetch and checkout the target tag
  git fetch origin --tags 2>&1 | tee -a "$DEPLOY_LOG"
  git checkout "v$target_version" 2>&1 | tee -a "$DEPLOY_LOG"

  info "Installing dependencies..."
  npm install --production=false 2>&1 | tee -a "$DEPLOY_LOG"

  info "Building client..."
  cd client
  npm run build 2>&1 | tee -a "$DEPLOY_LOG"
  cd ..

  info "Verifying .env exists..."
  if [[ ! -f server/.env ]]; then
    warn "server/.env not found — copying from .env.example"
    cp .env.example server/.env
    warn "Please edit server/.env with your production values"
  fi

  success "Build complete for v$target_version"
}

restart_server() {
  info "Restarting server with pm2..."

  if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.js --update-env 2>&1 | tee -a "$DEPLOY_LOG" || {
      # First time — need to start, not restart
      pm2 start ecosystem.config.js 2>&1 | tee -a "$DEPLOY_LOG"
      pm2 save 2>&1 | tee -a "$DEPLOY_LOG"
    }
  else
    warn "pm2 not found, falling back to direct node restart"
    # Kill existing node processes for this app
    pkill -f "node server/src/index.js" 2>/dev/null || true
    sleep 2
    nohup node server/src/index.js >> "$LOG_DIR/server.log" 2>&1 &
    echo $! > "$APP_DIR/server.pid"
  fi

  success "Server restarted"
}

rollback() {
  local target_version="$1"
  local current_version
  current_version=$(get_current_version)

  warn "Rolling back from v$current_version to v$target_version"

  pull_and_build "$target_version"
  save_version "$target_version"
  restart_server

  if health_check; then
    success "Rollback to v$target_version complete and healthy"
  else
    error "Rollback to v$target_version failed health check!"
    error "Manual intervention may be required"
    exit 1
  fi
}

deploy() {
  local force=${1:-false}
  local current_version
  current_version=$(get_current_version)

  info "Current version: v$current_version"
  info "Checking for updates..."

  local latest_version
  latest_version=$(get_latest_release)

  if [[ -z "$latest_version" ]]; then
    warn "Could not fetch latest release from GitHub"
    if [[ "$force" != "true" ]]; then
      error "Use --force to deploy anyway, or check GitHub repo settings"
      exit 1
    fi
    warn "Proceeding with --force"
  fi

  if [[ "$force" == "true" ]]; then
    warn "Force deploying latest version"
  elif [[ "$latest_version" == "$current_version" ]]; then
    success "Already up to date (v$current_version). Nothing to deploy."
    exit 0
  fi

  local target_version=${latest_version:-$current_version}
  info "Deploying v$target_version..."

  # Save backup of current version for potential rollback
  local previous_version="$current_version"
  echo "$previous_version" > "$LOG_DIR/previous-version"

  pull_and_build "$target_version"
  save_version "$target_version"
  restart_server

  if health_check; then
    success "Deploy complete! v$previous_version → v$target_version"
    success "Log: $DEPLOY_LOG"
  else
    error "Deploy completed but health check failed!"
    error "Attempting automatic rollback to v$previous_version..."
    rollback "$previous_version"
    exit 1
  fi
}

show_status() {
  local current_version
  current_version=$(get_current_version)
  local latest_version
  latest_version=$(get_latest_release)

  echo ""
  echo "================================="
  echo "  Mahakama Access Deploy Status"
  echo "================================="
  echo "  Current version:  v$current_version"

  if [[ -n "$latest_version" ]]; then
    echo "  Latest release:   v$latest_version"
    if [[ "$latest_version" == "$current_version" ]]; then
      echo "  Status:           ${GREEN}Up to date${NC}"
    else
      echo "  Status:           ${YELLOW}Update available${NC}"
    fi
  else
    echo "  Latest release:   ${YELLOW}Could not fetch${NC}"
  fi

  # Check if server is running
  if curl -s --connect-timeout 3 "$HEALTH_URL" | grep -q '"status":"ok"'; then
    echo "  Server:           ${GREEN}Running${NC}"
  else
    echo "  Server:           ${RED}Not responding${NC}"
  fi
  echo "================================="
  echo ""
}

# Main
mkdir -p "$LOG_DIR"

case "${1:-}" in
  --force)
    check_connection
    deploy true
    ;;
  --rollback)
    if [[ -z "${2:-}" ]]; then
      error "Usage: $0 --rollback <version>"
      exit 1
    fi
    check_connection
    rollback "$2"
    ;;
  --status)
    show_status
    ;;
  --version)
    get_current_version
    ;;
  --help|-h)
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  (no args)              Check for updates and deploy"
    echo "  --force                Deploy latest even if same version"
    echo "  --rollback <version>   Rollback to specific version (e.g., 1.0.0)"
    echo "  --status               Show current version and server status"
    echo "  --version              Print current version"
    echo "  --help                 Show this help"
    ;;
  "")
    check_connection
    deploy false
    ;;
  *)
    error "Unknown option: $1"
    echo "Run '$0 --help' for usage"
    exit 1
    ;;
esac
