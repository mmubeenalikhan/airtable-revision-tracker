import { airtableGet } from "./client";
import { paginate, Page } from "./paginate";

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export async function fetchAllRecords(
  baseId: string,
  tableId: string,
  onPage: (records: AirtableRecord[]) => Promise<void>
): Promise<number> {
  return paginate<AirtableRecord>(async (offset) => {
    const params = offset ? new URLSearchParams({ offset }) : undefined;
    const data = await airtableGet(`/${baseId}/${tableId}`, params);
    return { items: data.records, offset: data.offset } as Page<AirtableRecord>;
  }, onPage);
}
