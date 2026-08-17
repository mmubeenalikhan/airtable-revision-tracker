import { airtableGet } from "./client";
import { paginate, Page } from "./paginate";

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  fields: unknown[];
}

export async function fetchAllBases(onPage: (bases: AirtableBase[]) => Promise<void>): Promise<number> {
  return paginate<AirtableBase>(async (offset) => {
    const params = offset ? new URLSearchParams({ offset }) : undefined;
    const data = await airtableGet("/meta/bases", params);
    return { items: data.bases, offset: data.offset } as Page<AirtableBase>;
  }, onPage);
}

export async function listTables(baseId: string): Promise<AirtableTable[]> {
  const data = await airtableGet(`/meta/bases/${baseId}/tables`);
  return data.tables as AirtableTable[];
}
