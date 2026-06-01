#!/bin/bash
# ============================================================
# ETOSM VPS Deployment Script
# - Nginx serves React frontend directly from disk (port 3006)
# - PM2 runs only the backend (port 5007)
# - Public URL: http://31.97.237.122:3006
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
echo "  URL : http://31.97.237.122:3006"
echo "=========================================="

# ── 1. Install Node.js 20 if not present ───────────────────
if ! command -v node &> /dev/null; then
  echo "[1] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1] Node.js already installed: $(node -v)"
fi

# ── 2. Install PM2 globally ────────────────────────────────
if ! command -v pm2 &> /dev/null; then
  echo "[2] Installing PM2..."
  npm install -g pm2
else
  echo "[2] PM2 already installed: $(pm2 -v)"
fi

# ── 3. Build frontend ──────────────────────────────────────
echo "[3] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
echo "    Frontend build done -> $FRONTEND_DIR/build"

# ── 4. Set up backend ──────────────────────────────────────
echo "[4] Setting up backend..."
cd "$BACKEND_DIR"
npm install --production
if [ -f "$BACKEND_DIR/.env.production" ]; then
  cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
  echo "    Copied .env.production -> .env"
fi

# ── 5. Start/Restart backend with PM2 ─────────────────────
echo "[5] Starting etosm-backend with PM2..."
cd "$PROJECT_DIR"
pm2 delete etosm-backend  2>/dev/null || true
pm2 delete etosm-frontend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ── 6. Configure Nginx ─────────────────────────────────────
echo "[6] Configuring Nginx..."
cp "$PROJECT_DIR/nginx.etosm.conf" /etc/nginx/sites-available/etosm
ln -sf /etc/nginx/sites-available/etosm /etc/nginx/sites-enabled/etosm
nginx -t
systemctl reload nginx

echo ""
echo "=========================================="
echo " ETOSM is LIVE!"
echo " URL: http://31.97.237.122:3006"
echo " "
echo " PM2 (backend only, fork mode):"
echo "   pm2 status"
echo "   pm2 logs etosm-backend"
echo "   pm2 restart etosm-backend"
echo "=========================================="
