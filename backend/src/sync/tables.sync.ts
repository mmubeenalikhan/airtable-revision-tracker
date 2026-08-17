import { listTables, AirtableTable } from "../airtable/metaApi";
import { Table } from "../models/table.model";

export async function syncTables(baseId: string): Promise<{ count: number; tables: { airtableId: string; name: string }[] }> {
  const tables = await listTables(baseId);

  for (const table of tables) {
    await Table.updateOne(
      { airtableId: table.id },
      {
        $set: {
          airtableId: table.id,
          baseId,
          name: table.name,
          fields: table.fields,
          syncedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  return { count: tables.length, tables: tables.map((t) => ({ airtableId: t.id, name: t.name })) };
}

export async function findTableIdByName(baseId: string, name: string): Promise<string> {
  const tables: AirtableTable[] = await listTables(baseId);
  const match = tables.find((t) => t.name === name);
  if (!match) throw new Error(`Table "${name}" not found in base ${baseId}`);
  return match.id;
}
