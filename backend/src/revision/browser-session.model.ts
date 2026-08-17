import { Schema, model } from "mongoose";

const browserSessionSchema = new Schema(
  {
    cookies: { type: Schema.Types.Mixed, required: true },
    lastValidatedAt: { type: Date },
  },
  { versionKey: false, timestamps: true }
);

export const BrowserSession = model("BrowserSession", browserSessionSchema, "browser_sessions");

export async function getStoredSession() {
  return BrowserSession.findOne().sort({ createdAt: -1 });
}

export async function saveSession(cookies: unknown) {
  await BrowserSession.deleteMany({});
  return BrowserSession.create({ cookies, lastValidatedAt: new Date() });
}

export async function touchLastValidated(id: unknown) {
  await BrowserSession.updateOne({ _id: id }, { $set: { lastValidatedAt: new Date() } });
}

export async function clearSession() {
  await BrowserSession.deleteMany({});
}
