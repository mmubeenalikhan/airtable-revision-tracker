import type { Cookie } from "puppeteer";
import { getStoredSession, saveSession, touchLastValidated } from "./browser-session.model";
import { attemptAutoLogin } from "./puppeteer.service";

const VALIDATION_URL = "https://airtable.com/";

export class BrowserAuthRequiredError extends Error {
  constructor() {
    super("No valid browser session — authenticate via POST /api/revision/auth/start");
  }
}

export function toCookieHeader(cookies: Cookie[]): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function validateCookies(cookies: Cookie[]): Promise<boolean> {
  const response = await fetch(VALIDATION_URL, {
    headers: { Cookie: toCookieHeader(cookies) },
    redirect: "manual",
  });
  return response.status === 200;
}

export async function hasValidSession(): Promise<boolean> {
  const stored = await getStoredSession();
  if (!stored) return false;
  return validateCookies(stored.cookies);
}

export async function getValidCookies(): Promise<Cookie[]> {
  const stored = await getStoredSession();

  if (stored && (await validateCookies(stored.cookies))) {
    await touchLastValidated(stored._id);
    return stored.cookies;
  }

  const cookies = await attemptAutoLogin();
  await saveSession(cookies);
  return cookies;
}
