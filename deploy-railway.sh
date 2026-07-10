#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Mahakama Access — Railway Docker Deployment
# ─────────────────────────────────────────────────────────────
# Same Dockerfile as Render and Vercel.
# Push to main → Railway auto-deploys.
#
# Usage:
#   ./deploy-railway.sh              Deploy to production
#   ./deploy-railway.sh --preview    Deploy preview
#   ./deploy-railway.sh --setup      First-time Railway setup
# ─────────────────────────────────────────────────────────────

ACTION="deploy"
for arg in "$@"; do
  case "$arg" in
    --preview)  ACTION="preview" ;;
    --setup)    ACTION="setup" ;;
    --help|-h)
      echo "Usage: $0 [--preview|--setup]"
      echo "  (default)  Deploy to production"
      echo "  --preview  Deploy preview branch"
      echo "  --setup    First-time Railway init"
      exit 0
      ;;
  esac
done

command -v railway >/dev/null 2>&1 || {
  echo "❌ Install Railway CLI: npm install -g @railway/cli"
  exit 1
}

cd "$(dirname "${BASH_SOURCE[0]}")"

case "$ACTION" in
  setup)
    echo "🔗 Initializing Railway project..."
    railway login
    railway init
    echo ""
    echo "✅ Done. Now set env vars:"
    echo ""
    echo "   railway variables set MONGODB_URI='your-uri'"
    echo "   railway variables set JWT_SECRET='your-secret'"
    echo "   railway variables set SMTP_USER='your-email'"
    echo "   railway variables set SMTP_PASS='your-password'"
    echo ""
    echo "   Or set them in the Railway Dashboard."
    ;;

  preview)
    echo "🚀 Deploying preview to Railway..."
    railway up
    ;;

  deploy)
    echo "🚀 Deploying to Railway (production)..."
    railway up --service "$(railway status 2>/dev/null | grep -oP 'Service: \K.*' || echo '')"
    ;;
esac
