import { fetchAllBases, AirtableBase } from "../airtable/metaApi";
import { Base } from "./base.model";

export async function syncBases(): Promise<{ count: number; bases: { airtableId: string; name: string }[] }> {
  const synced: { airtableId: string; name: string }[] = [];

  const count = await fetchAllBases(async (bases: AirtableBase[]) => {
    for (const base of bases) {
      await Base.updateOne(
        { airtableId: base.id },
        {
          $set: {
            airtableId: base.id,
            name: base.name,
            permissionLevel: base.permissionLevel,
            syncedAt: new Date(),
          },
        },
        { upsert: true }
      );
      synced.push({ airtableId: base.id, name: base.name });
    }
  });

  return { count, bases: synced };
}
