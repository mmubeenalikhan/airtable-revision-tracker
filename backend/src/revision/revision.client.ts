import { randomUUID } from "crypto";
import { getValidCookies, toCookieHeader } from "./session.service";

const BASE_URL = "https://airtable.com";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

function randomToken(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 17)}`;
}

export async function fetchRevisionActivitiesPage(
  baseId: string,
  tableId: string,
  recordId: string,
  offsetV2?: string | null
): Promise<any> {
  const cookies = await getValidCookies();

  const stringifiedObjectParams = JSON.stringify({
    limit: 100,
    offsetV2: offsetV2 ?? null,
    shouldReturnDeserializedActivityItems: true,
    shouldIncludeRowActivityOrCommentUserObjById: true,
  });

  const url = new URL(`${BASE_URL}/v0.3/row/${recordId}/readRowActivitiesAndComments`);
  url.searchParams.set("stringifiedObjectParams", stringifiedObjectParams);
  url.searchParams.set("requestId", randomToken("req"));
  url.searchParams.set("secretSocketId", randomToken("soc"));

  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      cookie: toCookieHeader(cookies),
      referer: `${BASE_URL}/${baseId}/${tableId}/${recordId}`,
      "user-agent": USER_AGENT,
      "x-airtable-application-id": baseId,
      "x-airtable-inter-service-client": "webClient",
      "x-airtable-page-load-id": randomToken("pgl"),
      "x-requested-with": "XMLHttpRequest",
      "x-time-zone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      "x-user-locale": "en",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable revision history request failed (${response.status}) for record ${recordId}: ${text}`);
  }

  return response.json();
}
