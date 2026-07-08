// Secrets (MONGODB_URI, etc.) must NOT be hardcoded here — this file is
// committed to git. Put them in a `.env` file on the VPS (not committed,
// see .gitignore) and this config loads them at pm2 start time.
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

module.exports = {
  apps: [
    {
      name: "at-smart-salon",
      script: "node",
      args: "--enable-source-maps ./artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3011",
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
