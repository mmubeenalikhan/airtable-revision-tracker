import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    airtableId: { type: String, required: true, unique: true },
    baseId: { type: String, required: true, index: true },
    tableId: { type: String, required: true },
    fields: {
      Name: { type: String },
      Email: { type: String },
      Role: { type: String },
      Tickets: { type: [String], default: [] },
    },
    syncedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const User = model("User", userSchema);
