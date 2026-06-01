#!/bin/bash
# ============================================================
# ETOSM VPS Deployment Script (With Nginx Integration)
# Frontend: served by Nginx on Port 80/443
# Backend:  run by PM2 on Local Port 5007 and proxied via Nginx
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
echo "  Frontend URL : http://31.97.237.122:3006"
echo "  Backend Port : 5007 (Proxied via /api)"
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

# ── 3. Set up backend ──────────────────────────────────────
echo "[3] Setting up backend..."
cd "$BACKEND_DIR"
npm install --production
if [ -f "$BACKEND_DIR/.env.production" ]; then
  cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
  echo "    Copied .env.production to .env"
else
  echo "    Warning: .env.production not found in backend directory!"
fi
echo "    Backend dependencies installed and configured."

# ── 4. Build frontend ──────────────────────────────────────
echo "[4] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
echo "    Frontend static build generated successfully."

# ── 5. Start/Restart backend app with PM2 ──────────────────
echo "[5] Managing PM2 processes..."
cd "$PROJECT_DIR"

# Clean up old PM2 processes if they exist
pm2 delete etosm-backend 2>/dev/null || true
pm2 delete etosm-frontend 2>/dev/null || true

# Start backend using ecosystem config
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ── 6. Configure Nginx ─────────────────────────────────────
echo "[6] Configuring Nginx..."
if [ -f "$PROJECT_DIR/nginx.etosm.conf" ]; then
  # Copy config to sites-available
  cp "$PROJECT_DIR/nginx.etosm.conf" /etc/nginx/sites-available/etosm
  
  # Enable the site by creating a symlink
  ln -sf /etc/nginx/sites-available/etosm /etc/nginx/sites-enabled/etosm
  
  # Restore default Nginx site config if deleted, to prevent affecting port 80 sites like payroll
  if [ ! -f /etc/nginx/sites-enabled/default ] && [ -f /etc/nginx/sites-available/default ]; then
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    echo "    Restored default Nginx site configuration."
  fi
  
  # Test config and reload Nginx
  echo "    Testing Nginx configuration..."
  nginx -t
  
  echo "    Reloading Nginx..."
  systemctl reload nginx
  echo "    Nginx reload complete."
else
  echo "    Error: nginx.etosm.conf not found! Skipping Nginx setup."
  exit 1
fi

echo ""
echo "=========================================="
echo " ✅ ETOSM is LIVE!"
echo " "
echo "   🌐 URL : http://31.97.237.122:3006"
echo " "
echo "   Useful commands:"
echo "     pm2 status              → Check backend status"
echo "     pm2 logs etosm-backend  → Live backend logs"
echo "     systemctl status nginx  → Nginx status"
echo "=========================================="
