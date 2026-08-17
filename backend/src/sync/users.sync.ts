import { fetchAllRecords, AirtableRecord } from "../airtable/recordsApi";
import { findTableIdByName } from "./tables.sync";
import { User } from "../models/user.model";

export async function syncUsers(baseId: string): Promise<{ count: number; tableId: string }> {
  const tableId = await findTableIdByName(baseId, "Users");

  const count = await fetchAllRecords(baseId, tableId, async (records: AirtableRecord[]) => {
    for (const record of records) {
      await User.updateOne(
        { airtableId: record.id },
        {
          $set: {
            airtableId: record.id,
            baseId,
            tableId,
            fields: {
              Name: record.fields.Name,
              Email: record.fields.Email,
              Role: record.fields.Role,
              Tickets: record.fields.Tickets ?? [],
            },
            syncedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  });

  return { count, tableId };
}
