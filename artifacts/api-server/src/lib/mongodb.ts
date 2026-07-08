import mongoose from "mongoose";
import { logger } from "./logger";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

// Fail fast instead of silently queuing queries when the connection drops.
// With buffering enabled, requests made while disconnected hang until the
// default ~10s buffer timeout, which is what causes upstream gateway
// timeouts (502/504) under a reverse proxy after the connection goes stale.
mongoose.set("bufferCommands", false);

let isConnected = false;
let isConnecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  maxPoolSize: 10,
};

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectMongo().catch((err) => {
      logger.error({ err }, "MongoDB reconnect attempt failed");
    });
  }, 5000);
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.error("MongoDB disconnected — will attempt to reconnect");
  scheduleReconnect();
});

mongoose.connection.on("error", (err) => {
  logger.error({ err }, "MongoDB connection error");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  logger.info("MongoDB reconnected");
});

export async function connectMongo() {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState;
  if (isConnected || isConnecting || readyState === 1 || readyState === 2) return;

  isConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI as string, CONNECT_OPTIONS);
    isConnected = true;
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    scheduleReconnect();
    throw err;
  } finally {
    isConnecting = false;
  }
}

export default mongoose;
