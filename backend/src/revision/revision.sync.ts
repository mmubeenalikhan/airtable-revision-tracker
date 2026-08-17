import { Ticket } from "../models/ticket.model";
import { TicketRevision } from "./ticket-revision.model";
import { env } from "../config/env";
import { fetchRevisionActivitiesPage } from "./revision.client";
import { parseDiffRowHtml } from "./revision.parser";

const RETRY_ATTEMPTS = 3;

export interface BulkSyncResult {
  total: number;
  completed: number;
  failed: number;
  failedTicketIds: string[];
}

interface TicketRef {
  airtableId: string;
  baseId: string;
  tableId: string;
}

async function syncOneTicket(ticket: TicketRef): Promise<number> {
  let offsetV2: string | undefined;
  let upserted = 0;

  do {
    const response = await fetchRevisionActivitiesPage(ticket.baseId, ticket.tableId, ticket.airtableId, offsetV2);
    // Airtable wraps the payload as { msg: "SUCCESS", data: {...} }.
    const page = response.data ?? {};
    const orderedActivityAndCommentIds: string[] = page.orderedActivityAndCommentIds ?? [];
    const rowActivityInfoById: Record<string, any> = page.rowActivityInfoById ?? {};
    const userObjById: Record<string, any> = page.rowActivityOrCommentUserObjById ?? {};

    for (const activityId of orderedActivityAndCommentIds) {
      const activity = rowActivityInfoById[activityId];
      if (!activity?.diffRowHtml) continue;

      let parsed;
      try {
        parsed = parseDiffRowHtml(activity.diffRowHtml);
      } catch (err) {
        console.error(`Revision parsing failed for activity ${activityId}: ${(err as Error).message}`);
        continue;
      }
      if (!parsed) continue;

      const user = userObjById[activity.originatingUserId];

      await TicketRevision.updateOne(
        { activityId },
        {
          $set: {
            activityId,
            ticketId: ticket.airtableId,
            columnType: parsed.columnType,
            oldValue: parsed.oldValue,
            newValue: parsed.newValue,
            createdTime: new Date(activity.createdTime),
            authoredById: activity.originatingUserId ?? null,
            authoredByName: user?.name ?? null,
            groupType: activity.groupType ?? null,
          },
        },
        { upsert: true }
      );
      upserted++;
    }

    offsetV2 = page.offsetV2 ?? undefined;
  } while (offsetV2);

  return upserted;
}

async function syncOneTicketWithRetries(ticket: TicketRef): Promise<number> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await syncOneTicket(ticket);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    await worker(items[current]);
    return next();
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, next));
}

export async function syncAllTicketRevisions(): Promise<BulkSyncResult> {
  const tickets = await Ticket.find({}, { airtableId: 1, baseId: 1, tableId: 1 });
  const ticketRefs: TicketRef[] = tickets.map((t) => ({
    airtableId: t.airtableId as string,
    baseId: t.baseId as string,
    tableId: t.tableId as string,
  }));

  let completed = 0;
  let failed = 0;
  const failedTicketIds: string[] = [];

  await runWithConcurrency(ticketRefs, env.revisionSyncConcurrency, async (ticket) => {
    try {
      await syncOneTicketWithRetries(ticket);
      completed++;
      console.log(`Ticket sync completed: ${ticket.airtableId}`);
    } catch (err) {
      failed++;
      failedTicketIds.push(ticket.airtableId);
      console.error(`Ticket synchronization failed: ${ticket.airtableId} — ${(err as Error).message}`);
    }
  });

  return { total: ticketRefs.length, completed, failed, failedTicketIds };
}

export async function syncSingleTicketRevisions(ticketId: string): Promise<number> {
  const ticket = await Ticket.findOne({ airtableId: ticketId }, { airtableId: 1, baseId: 1, tableId: 1 });
  if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);

  const ticketRef: TicketRef = {
    airtableId: ticket.airtableId as string,
    baseId: ticket.baseId as string,
    tableId: ticket.tableId as string,
  };

  const count = await syncOneTicketWithRetries(ticketRef);
  console.log(`Ticket sync completed: ${ticketId}`);
  return count;
}
