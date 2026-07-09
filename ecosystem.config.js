const path = require('path');

const APP_DIR = process.env.APP_DIR || path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'mahakama-access-server',
      script: 'server/src/index.js',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(APP_DIR, 'logs/server-error.log'),
      out_file: path.join(APP_DIR, 'logs/server-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
