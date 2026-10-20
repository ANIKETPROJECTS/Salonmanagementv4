import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import http from "http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { connectMongo } from "./lib/mongodb.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB before handling requests
connectMongo().catch((err) => {
  logger.error({ err }, "Failed to connect to MongoDB on startup");
});

app.use("/api", router);

const apiErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error({ err, method: req.method, path: req.path }, "Unhandled request error");
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(apiErrorHandler);

// In production, serve the built React app and handle SPA routing
if (process.env.NODE_ENV === "production") {
  const staticPath = path.join(process.cwd(), "artifacts/salon-app/dist/public");
  app.use(express.static(staticPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
} else {
  // In development, proxy all non-API requests to the Vite dev server on port 5000.
  // This is needed because Replit's artifact router sends main-domain traffic to
  // this API server (port 8080) instead of the Vite server (port 5000).
  app.use((req, res) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:5000`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on("error", () => {
      res.status(503).send("Frontend dev server not ready yet — please refresh.");
    });

    req.pipe(proxyReq, { end: true });
  });
}

export default app;
