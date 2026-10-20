import { Router, type IRouter } from "express";
import { isMongoConnected } from "../lib/mongodb.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const connected = isMongoConnected();
  res.status(connected ? 200 : 503).json({ status: connected ? "ok" : "unavailable" });
});

export default router;
