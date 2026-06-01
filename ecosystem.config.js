// PM2 Ecosystem Config — ETOSM Project
// Frontend: http://31.97.237.122:3006
// Backend:  http://31.97.237.122:5007

module.exports = {
  apps: [
    // ── Backend ──────────────────────────────────
    {
      name: 'etosm-backend',
      script: 'server.js',
      cwd: '/var/www/projects/etosm/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5007,
        MONGO_URI: 'mongodb+srv://ETOSM:ETOSM@cluster0.nh4rh0w.mongodb.net/?appName=Cluster0',
        JWT_SECRET: 'Etosm_secret_key_2026',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5007,
        MONGO_URI: 'mongodb+srv://ETOSM:ETOSM@cluster0.nh4rh0w.mongodb.net/?appName=Cluster0',
        JWT_SECRET: 'Etosm_secret_key_2026',
      },
    },

    // ── Frontend (static build via PM2 built-in server) ──
    {
      name: 'etosm-frontend',
      script: 'serve',
      cwd: '/var/www/projects/etosm/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PM2_SERVE_PATH: './build',
        PM2_SERVE_PORT: 3006,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
      env_production: {
        PM2_SERVE_PATH: './build',
        PM2_SERVE_PORT: 3006,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
    },
  ],
};
