import { Router } from "express";
import { startLogin, submitMfa } from "./puppeteer.service";
import { clearSession, saveSession } from "./browser-session.model";
import { hasValidSession } from "./session.service";
import { Ticket } from "../models/ticket.model";
import { syncAllTicketRevisions, syncSingleTicketRevisions } from "./revision.sync";

export const revisionRoutes = Router();

function handleErrors(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (err) {
      res.status(502).json({ status: "error", error: (err as Error).message });
    }
  };
}

revisionRoutes.get(
  "/status",
  handleErrors(async (_req, res) => {
    const [authenticated, ticketCount] = await Promise.all([hasValidSession(), Ticket.countDocuments()]);
    res.json({ authenticated, ticketCount });
  })
);

revisionRoutes.post(
  "/auth/start",
  handleErrors(async (_req, res) => {
    const sessionId = await startLogin();
    res.json({ sessionId });
  })
);

revisionRoutes.post(
  "/auth/mfa",
  handleErrors(async (req, res) => {
    const { sessionId, code } = req.body ?? {};
    if (typeof sessionId !== "string" || typeof code !== "string") {
      res.status(400).json({ status: "error", error: "sessionId and code are required" });
      return;
    }

    const cookies = await submitMfa(sessionId, code);
    await saveSession(cookies);
    res.json({ status: "authenticated" });
  })
);

revisionRoutes.post(
  "/auth/disconnect",
  handleErrors(async (_req, res) => {
    await clearSession();
    res.json({ status: "disconnected" });
  })
);

revisionRoutes.post(
  "/sync",
  handleErrors(async (_req, res) => {
    const result = await syncAllTicketRevisions();
    res.json(result);
  })
);

revisionRoutes.post(
  "/sync/:ticketId",
  handleErrors(async (req, res) => {
    const count = await syncSingleTicketRevisions(req.params.ticketId);
    res.json({ ticketId: req.params.ticketId, count });
  })
);
