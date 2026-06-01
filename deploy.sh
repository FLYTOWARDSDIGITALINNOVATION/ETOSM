#!/bin/bash
# ============================================================
# ETOSM VPS Deployment Script (No Nginx — Direct IP:Port)
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

echo "=============================="
echo " ETOSM — Starting Deployment"
echo " Frontend → :3006"
echo " Backend  → :5007"
echo "=============================="

# ── 1. Install Node.js 20 if not present ───────────────────
if ! command -v node &> /dev/null; then
  echo "[1] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1] Node.js: $(node -v)"
fi

# ── 2. Install PM2 + serve globally ────────────────────────
if ! command -v pm2 &> /dev/null; then
  echo "[2] Installing PM2..."
  npm install -g pm2
else
  echo "[2] PM2: $(pm2 -v)"
fi

if ! command -v serve &> /dev/null; then
  echo "[2] Installing serve..."
  npm install -g serve
else
  echo "[2] serve already installed"
fi

# ── 3. Set up backend ──────────────────────────────────────
echo "[3] Setting up backend..."
cd "$BACKEND_DIR"
npm install --production
cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
echo "    Backend ready ✓"

# ── 4. Build frontend ──────────────────────────────────────
echo "[4] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
echo "    Frontend built ✓"

# ── 5. Start/Restart both apps with PM2 ───────────────────
echo "[5] Starting apps with PM2..."
cd "$PROJECT_DIR"

pm2 delete etosm-backend  2>/dev/null || true
pm2 delete etosm-frontend 2>/dev/null || true

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=============================="
echo " ✅ ETOSM is LIVE!"
echo ""
echo "   🌐 Site    : http://31.97.237.122:3006"
echo "   ⚙️  Backend : http://31.97.237.122:5007"
echo ""
echo "   pm2 logs etosm-backend   → backend logs"
echo "   pm2 logs etosm-frontend  → frontend logs"
echo "   pm2 status               → all processes"
echo "=============================="
