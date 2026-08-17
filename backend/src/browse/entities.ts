import { Model } from "mongoose";
import { Ticket } from "../models/ticket.model";
import { User } from "../models/user.model";

export interface BrowseEntity {
  id: string;
  label: string;
  model: Model<any>;
  tableName: string;
}

export const BROWSE_ENTITIES: BrowseEntity[] = [
  { id: "tickets", label: "Tickets", model: Ticket, tableName: "Tickets" },
  { id: "users", label: "Users", model: User, tableName: "Users" },
];

export function findBrowseEntity(id: string): BrowseEntity | undefined {
  return BROWSE_ENTITIES.find((e) => e.id === id);
}
