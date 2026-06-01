// PM2 Ecosystem Config — ETOSM Project
// Only the backend runs in PM2.
// Nginx serves the React frontend build directly from disk on port 3006.

module.exports = {
  apps: [
    {
      name: 'etosm-backend',
      script: 'server.js',
      cwd: '/var/www/projects/etosm/backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5007,
        MONGO_URI: 'mongodb+srv://ETOSM:ETOSM@cluster0.nh4rh0w.mongodb.net/?appName=Cluster0',
        JWT_SECRET: 'Etosm_secret_key_2026',
      },
    },
  ],
};
