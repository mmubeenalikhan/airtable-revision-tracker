import { Schema, model } from "mongoose";

const ticketSchema = new Schema(
  {
    airtableId: { type: String, required: true, unique: true },
    baseId: { type: String, required: true, index: true },
    tableId: { type: String, required: true },
    fields: { type: Schema.Types.Mixed },
    syncedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Ticket = model("Ticket", ticketSchema);
