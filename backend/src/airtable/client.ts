import { getValidAccessToken } from "../auth/tokenService";

const BASE_URL = "https://api.airtable.com/v0";
const MIN_REQUEST_GAP_MS = 200;
const MAX_RETRIES = 5;

let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

export class NotConnectedError extends Error {
  constructor() {
    super("Not connected to Airtable — visit /auth/airtable/login first");
  }
}

export async function airtableGet(path: string, searchParams?: URLSearchParams): Promise<any> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new NotConnectedError();

  const url = new URL(`${BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of searchParams) url.searchParams.append(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable API error (${response.status}) for ${path}: ${text}`);
    }

    return response.json();
  }

  throw new Error(`Airtable API rate limit retries exhausted for ${path}`);
}
