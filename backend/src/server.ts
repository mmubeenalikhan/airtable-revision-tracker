import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env";
import { airtableAuthRoutes } from "./auth/airtableAuth.routes";
import { syncRoutes } from "./sync/sync.routes";
import { statusRoutes } from "./auth/status.routes";
import { revisionRoutes } from "./revision/revision.routes";
import { browseRoutes } from "./browse/browse.routes";

async function main() {
  await mongoose.connect(env.mongodbUri);

  const app = express();
  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json());

  app.use("/auth/airtable", airtableAuthRoutes);
  app.use("/api/sync", syncRoutes);
  app.use("/api/revision", revisionRoutes);
  app.use("/api/browse", browseRoutes);
  app.use("/api/auth", statusRoutes);

  app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
