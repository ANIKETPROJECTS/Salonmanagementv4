import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Without these, an unhandled rejection or uncaught exception leaves the
// process running in a broken state — pm2 sees it as "online" (no crash to
// restart from) but it stops responding, which surfaces as a 502/504 at the
// reverse proxy. Exiting lets pm2's autorestart bring up a clean process.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection — exiting for restart");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — exiting for restart");
  process.exit(1);
});

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Avoid hung sockets piling up if a client (or the reverse proxy) leaves a
// connection open longer than it should.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
