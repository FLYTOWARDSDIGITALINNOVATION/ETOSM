#!/bin/bash
# ============================================================
# ETOSM VPS Deployment Script
# Frontend on port 3006 (PM2 serve), Backend on port 5007 (PM2)
# Frontend: http://31.97.237.122:3006
# Backend:  http://31.97.237.122:5007
#
# Run this ON the VPS as root:
#   cd /var/www/projects/etosm && bash deploy.sh
# ============================================================

set -e

PROJECT_DIR="/var/www/projects/etosm"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=========================================="
echo "      ETOSM — Starting Deployment"
echo "  Frontend : http://31.97.237.122:3006"
echo "  Backend  : http://31.97.237.122:5007"
echo "  (Both running in PM2 FORK mode)"
echo "=========================================="

# ── 1. Install Node.js 20 if not present ───────────────────
if ! command -v node &> /dev/null; then
  echo "[1] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1] Node.js is already installed: $(node -v)"
fi

# ── 2. Install PM2 globally ────────────────────────────────
if ! command -v pm2 &> /dev/null; then
  echo "[2] Installing PM2..."
  npm install -g pm2
else
  echo "[2] PM2 is already installed: $(pm2 -v)"
fi

# ── 3. Build frontend first ────────────────────────────────
echo "[3] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
echo "    Frontend static build generated successfully."

# ── 4. Set up backend ──────────────────────────────────────
echo "[4] Setting up backend..."
cd "$BACKEND_DIR"
npm install --production
if [ -f "$BACKEND_DIR/.env.production" ]; then
  cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
  echo "    Copied .env.production to .env"
fi
echo "    Backend dependencies installed."

# ── 5. Start/Restart processes with PM2 ─────────────────────
echo "[5] Starting etosm-backend and etosm-frontend with PM2..."
cd "$PROJECT_DIR"

pm2 delete etosm-backend  2>/dev/null || true
pm2 delete etosm-frontend 2>/dev/null || true

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================="
echo " ✅ ETOSM is LIVE!"
echo " "
echo "   🌐 Frontend URL : http://31.97.237.122:3006"
echo "   🌐 Backend URL  : http://31.97.237.122:5007"
echo " "
echo "   Both frontend and backend are running under PM2 in FORK mode!"
echo " "
echo "   Useful commands:"
echo "     pm2 status              → Check status of all projects"
echo "     pm2 logs etosm-frontend → Live logs for Frontend"
echo "     pm2 logs etosm-backend  → Live logs for Backend"
echo "     pm2 restart etosm-frontend etosm-backend → Restart both"
echo "=========================================="
