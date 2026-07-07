module.exports = {
  apps: [
    {
      name: "at-smart-salon",
      script: "node",
      args: "--enable-source-maps ./artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: "3011",
        MONGODB_URI: process.env.MONGODB_URI,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
