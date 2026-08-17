import { fetchAllRecords, AirtableRecord } from "../airtable/recordsApi";
import { findTableIdByName } from "./tables.sync";
import { Ticket } from "../models/ticket.model";

export async function syncTickets(baseId: string): Promise<{ count: number; tableId: string }> {
  const tableId = await findTableIdByName(baseId, "Tickets");

  const count = await fetchAllRecords(baseId, tableId, async (records: AirtableRecord[]) => {
    for (const record of records) {
      await Ticket.updateOne(
        { airtableId: record.id },
        {
          $set: {
            airtableId: record.id,
            baseId,
            tableId,
            fields: record.fields,
            syncedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  });

  return { count, tableId };
}
