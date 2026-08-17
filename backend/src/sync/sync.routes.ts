import { Router } from "express";
import { syncBases } from "./bases.sync";
import { syncTables } from "./tables.sync";
import { syncTickets } from "./tickets.sync";
import { syncUsers } from "./users.sync";

export const syncRoutes = Router();

function handleErrors(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (err) {
      res.status(502).json({ status: "error", error: (err as Error).message });
    }
  };
}

syncRoutes.post(
  "/bases",
  handleErrors(async (_req, res) => {
    const result = await syncBases();
    res.json(result);
  })
);

syncRoutes.post(
  "/tables/:baseId",
  handleErrors(async (req, res) => {
    const result = await syncTables(req.params.baseId);
    res.json(result);
  })
);

syncRoutes.post(
  "/tickets/:baseId",
  handleErrors(async (req, res) => {
    const result = await syncTickets(req.params.baseId);
    res.json(result);
  })
);

syncRoutes.post(
  "/users/:baseId",
  handleErrors(async (req, res) => {
    const result = await syncUsers(req.params.baseId);
    res.json(result);
  })
);

syncRoutes.post(
  "/all/:baseId",
  handleErrors(async (req, res) => {
    const { baseId } = req.params;
    const tables = await syncTables(baseId);
    const tickets = await syncTickets(baseId);
    const users = await syncUsers(baseId);
    res.json({ tables, tickets, users });
  })
);
