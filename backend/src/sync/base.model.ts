import { Schema, model } from "mongoose";

const baseSchema = new Schema(
  {
    airtableId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    permissionLevel: { type: String },
    syncedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Base = model("Base", baseSchema);
