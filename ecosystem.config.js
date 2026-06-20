module.exports = {
  apps: [
    {
      name: "gameplaza-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/gameplaza",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/gameplaza-web-error.log",
      out_file: "/var/log/pm2/gameplaza-web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
    {
      name: "gameplaza-worker",
      script: "src/workers/import-worker.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/gameplaza",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pm2/gameplaza-worker-error.log",
      out_file: "/var/log/pm2/gameplaza-worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
}
