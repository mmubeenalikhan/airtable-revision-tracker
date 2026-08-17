import { Router } from "express";
import { BROWSE_ENTITIES, findBrowseEntity } from "./entities";
import { Table } from "../models/table.model";

export const browseRoutes = Router();

interface AirtableFieldSchema {
  id?: string;
  name: string;
  type?: string;
}

interface BrowseColumn {
  field: string;
  headerName: string;
  airtableType?: string;
}

const META_COLUMNS: BrowseColumn[] = [
  { field: "airtableId", headerName: "Airtable ID" },
  { field: "syncedAt", headerName: "Synced At" },
];

browseRoutes.get("/entities", (_req, res) => {
  res.json(BROWSE_ENTITIES.map((e) => ({ id: e.id, label: e.label })));
});

browseRoutes.get("/:entity/records", async (req, res) => {
  const entity = findBrowseEntity(req.params.entity);
  if (!entity) {
    res.status(404).json({ error: `Unknown entity "${req.params.entity}"` });
    return;
  }

  const records = await entity.model.find({}).lean();

  const firstTableId = (records[0] as { tableId?: string } | undefined)?.tableId;
  const tableDoc = firstTableId
    ? await Table.findOne({ airtableId: firstTableId }).lean()
    : await Table.findOne({ name: entity.tableName }).lean();

  let columns: BrowseColumn[];
  if (tableDoc?.fields?.length) {
    columns = (tableDoc.fields as AirtableFieldSchema[]).map((f) => ({
      field: f.name,
      headerName: f.name,
      airtableType: f.type,
    }));
  } else {
    const fieldNames = new Set<string>();
    for (const record of records as unknown[]) {
      const fields = (record as { fields?: Record<string, unknown> }).fields ?? {};
      for (const key of Object.keys(fields)) fieldNames.add(key);
    }
    columns = Array.from(fieldNames).map((name) => ({ field: name, headerName: name }));
  }

  const rows = (records as unknown[]).map((record) => {
    const r = record as { airtableId: string; syncedAt: Date; fields?: Record<string, unknown> };
    return { airtableId: r.airtableId, syncedAt: r.syncedAt, ...(r.fields ?? {}) };
  });

  res.json({ columns: [...META_COLUMNS, ...columns], rows });
});
