/** PM2 — backend BID em produção (aaPanel: Project → Add Node → script start) */
module.exports = {
  apps: [
    {
      name: 'bid-backend',
      cwd: '/www/server/BID_NEW/BID/backend',
      script: 'server.js',
      node_args: '--max-old-space-size=4096',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },
  ],
};
