import * as cheerio from "cheerio";

export interface ParsedRevision {
  columnType: string;
  oldValue: string | null;
  newValue: string | null;
}

const COLUMN_LABEL_SELECTOR = ".historicalCellContainer > div[columnId]";
const PILL_SELECTOR = '[class*="pill"]';
const STRIKETHROUGH_SELECTOR = "s, strike, del";
const FOREIGN_RECORD_SELECTOR = ".foreignRecordRendererContainer";

const TRACKED_COLUMNS = new Set(["Status", "Assignee"]);


export function parseDiffRowHtml(html: string): ParsedRevision | null {
  const $ = cheerio.load(html);

  const columnType = $(COLUMN_LABEL_SELECTOR).first().text().trim();
  if (!TRACKED_COLUMNS.has(columnType)) return null;

  if (columnType === "Assignee") return parseForeignKeyDiff($, columnType);
  return parsePillDiff($, columnType);
}

function isStrikethrough($: cheerio.CheerioAPI, el: any): boolean {
  const $el = $(el);
  if ($el.find(STRIKETHROUGH_SELECTOR).length > 0) return true;
  const style = $el.attr("style") ?? "";
  if (/line-through/.test(style)) return true;
  const className = $el.attr("class") ?? "";
  return /strikethrough|removed/i.test(className);
}

function parsePillDiff($: cheerio.CheerioAPI, columnType: string): ParsedRevision {
  let oldValue: string | null = null;
  let newValue: string | null = null;

  $(PILL_SELECTOR).each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;

    if (isStrikethrough($, el)) {
      oldValue = text;
    } else {
      newValue = text;
    }
  });

  return { columnType, oldValue, newValue };
}

function parseForeignKeyDiff($: cheerio.CheerioAPI, columnType: string): ParsedRevision {
  const values = $(FOREIGN_RECORD_SELECTOR)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 0);

  if (values.length <= 1) {
    return { columnType, oldValue: null, newValue: values[0] ?? null };
  }

  const [oldValue, newValue] = values;
  return { columnType, oldValue, newValue };
}
