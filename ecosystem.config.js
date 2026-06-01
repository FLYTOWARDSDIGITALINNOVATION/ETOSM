// PM2 Ecosystem Config — ETOSM Project
// Only runs the backend Node.js server. Nginx serves the React frontend build directly.

module.exports = {
  apps: [
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
  ],
};
