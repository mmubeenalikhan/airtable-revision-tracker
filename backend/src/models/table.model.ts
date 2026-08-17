import { Schema, model } from "mongoose";

const tableSchema = new Schema(
  {
    airtableId: { type: String, required: true, unique: true },
    baseId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    fields: { type: Schema.Types.Mixed },
    syncedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Table = model("Table", tableSchema);
