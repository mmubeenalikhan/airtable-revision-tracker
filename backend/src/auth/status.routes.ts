import { Router } from "express";
import { isConnected } from "./tokenService";

export const statusRoutes = Router();

statusRoutes.get("/status", async (_req, res) => {
  res.json({ connected: await isConnected() });
});
