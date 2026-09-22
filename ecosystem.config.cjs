module.exports = {
  apps: [
    {
      name: 'pkg-tracker-api',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        PORT: 5001
      },
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        PORT: 5001
      },
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
