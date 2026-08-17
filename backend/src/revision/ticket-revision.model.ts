import { Schema, model } from "mongoose";

const ticketRevisionSchema = new Schema(
  {
    activityId: { type: String, required: true, unique: true },
    ticketId: { type: String, required: true, index: true },
    columnType: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    createdTime: { type: Date, required: true, index: true },
    authoredById: { type: String, default: null },
    authoredByName: { type: String, default: null },
    groupType: { type: String, default: null },
  },
  { versionKey: false }
);

export const TicketRevision = model("TicketRevision", ticketRevisionSchema, "ticket_revisions");
