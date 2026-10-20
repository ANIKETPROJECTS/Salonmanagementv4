import app from "./app";
import { logger } from "./lib/logger";
import { disconnectMongo } from "./lib/mongodb.js";

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

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
server.on("error", (err) => {
  logger.error({ err, port }, "HTTP server error — exiting for restart");
  process.exit(1);
});

// Avoid hung sockets piling up if a client (or the reverse proxy) leaves a
// connection open longer than it should.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

let isShuttingDown = false;

server.on("close", () => {
  if (isShuttingDown) return;
  logger.fatal("HTTP server closed unexpectedly — exiting for restart");
  process.exit(1);
});

function shutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress");
    return;
  }
  isShuttingDown = true;
  logger.info({ signal }, "Shutting down");
  const shutdownTimeout = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, 15000);

  server.close(async (err) => {
    let exitCode = 0;
    if (err) {
      logger.error({ err, signal }, "HTTP server failed to close cleanly");
      exitCode = 1;
    }
    try {
      await disconnectMongo();
    } catch (disconnectError) {
      logger.error({ err: disconnectError, signal }, "MongoDB failed to close cleanly");
      exitCode = 1;
    }
    clearTimeout(shutdownTimeout);
    logger.info({ signal, exitCode }, "Shutdown complete");
    process.exitCode = exitCode;
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
