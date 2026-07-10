#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Mahakama Access — Vercel Docker Deployment
# ─────────────────────────────────────────────────────────────
# Both Render and Vercel deploy the SAME Dockerfile.
# Push to main → both platforms auto-deploy.
#
# Usage:
#   ./deploy-vercel.sh              Deploy to production
#   ./deploy-vercel.sh --preview    Deploy preview branch
#   ./deploy-vercel.sh --setup      First-time Vercel setup
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
      echo "  --setup    First-time Vercel project link"
      exit 0
      ;;
  esac
done

command -v vercel >/dev/null 2>&1 || {
  echo "❌ Install Vercel CLI: npm install -g vercel"
  exit 1
}

cd "$(dirname "${BASH_SOURCE[0]}")"

case "$ACTION" in
  setup)
    echo "🔗 Linking Vercel project..."
    vercel link
    echo ""
    echo "✅ Done. Now set env vars in Vercel Dashboard:"
    echo ""
    echo "   Required:"
    echo "   - MONGODB_URI"
    echo "   - JWT_SECRET"
    echo "   - SMTP_USER"
    echo "   - SMTP_PASS"
    echo ""
    echo "   Auto-set by Dockerfile:"
    echo "   - PORT=3000 (Vercel injects this)"
    echo "   - NODE_ENV=production"
    ;;

  preview)
    echo "🚀 Deploying preview to Vercel..."
    vercel --pre
    ;;

  deploy)
    echo "🚀 Deploying to Vercel (production)..."
    vercel --prod
    ;;
esac
