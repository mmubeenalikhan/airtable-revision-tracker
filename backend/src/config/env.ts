import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: required("MONGODB_URI"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:4200",
  airtable: {
    clientId: required("AIRTABLE_CLIENT_ID"),
    clientSecret: required("AIRTABLE_CLIENT_SECRET"),
    redirectUri: required("AIRTABLE_REDIRECT_URI"),
    scopes: (process.env.AIRTABLE_SCOPES ?? "schema.bases:read data.records:read").split(" "),
  },
  browserAuth: {
    email: process.env.AIRTABLE_EMAIL,
    password: process.env.AIRTABLE_PASSWORD,
  },
  revisionSyncConcurrency: Number(process.env.REVISION_SYNC_CONCURRENCY ?? 5),
};
