module.exports = {
  apps: [
    {
      name: 'pkg-tracker-api',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      watch: false,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
