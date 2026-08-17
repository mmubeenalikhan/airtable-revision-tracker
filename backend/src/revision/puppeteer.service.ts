import puppeteer, { Browser, Cookie, Page } from "puppeteer";
import { randomUUID } from "crypto";
import { env } from "../config/env";

const LOGIN_URL = "https://airtable.com/login";
const EMAIL_SELECTOR = 'input[type="email"]';
const PASSWORD_SELECTOR = 'input[type="password"]';
const MFA_INPUT_SELECTOR = 'input[name="code"]';
const SUBMIT_BUTTON_SELECTOR = 'button[type="submit"]';
const SELECTOR_TIMEOUT_MS = 30_000;

const COOKIE_BANNER_REJECT_SELECTOR = "pierce/#RejectAllAndClose";
const COOKIE_BANNER_TIMEOUT_MS = 4_000;

export class MfaRequiredError extends Error {
  constructor() {
    super("Airtable requires MFA — complete authentication via /api/revision/auth/start and /api/revision/auth/mfa");
  }
}

interface PendingLogin {
  browser: Browser;
  page: Page;
}

const pendingLogins = new Map<string, PendingLogin>();

function requireCredentials(): { email: string; password: string } {
  const { email, password } = env.browserAuth;
  if (!email || !password) {
    throw new Error("Missing AIRTABLE_EMAIL or AIRTABLE_PASSWORD environment variables");
  }
  return { email, password };
}

async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const button = await page.waitForSelector(COOKIE_BANNER_REJECT_SELECTOR, { timeout: COOKIE_BANNER_TIMEOUT_MS });
    await button?.click();
  } catch {
    // ignore
  }
}

async function typeIntoField(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT_MS });
  await page.click(selector, { count: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}

async function submitStep(page: Page): Promise<void> {
  const submitButton = await page.$(SUBMIT_BUTTON_SELECTOR);
  if (submitButton) {
    await submitButton.click();
  } else {
    await page.keyboard.press("Enter");
  }
}

async function waitForLoginToComplete(page: Page): Promise<void> {
  await page.waitForFunction('!window.location.pathname.startsWith("/login")', {
    timeout: SELECTOR_TIMEOUT_MS,
  });
}

async function enterCredentials(page: Page): Promise<void> {
  const { email, password } = requireCredentials();

  await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });
  await dismissCookieBanner(page);

  await typeIntoField(page, EMAIL_SELECTOR, email);
  await submitStep(page);
  await dismissCookieBanner(page);

  await typeIntoField(page, PASSWORD_SELECTOR, password);
  await submitStep(page);
  await dismissCookieBanner(page);
}

export async function startLogin(): Promise<string> {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  try {
    await enterCredentials(page);
    await page.waitForSelector(MFA_INPUT_SELECTOR, { timeout: SELECTOR_TIMEOUT_MS });

    const sessionId = randomUUID();
    pendingLogins.set(sessionId, { browser, page });
    return sessionId;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

export async function submitMfa(sessionId: string, code: string): Promise<Cookie[]> {
  const pending = pendingLogins.get(sessionId);
  if (!pending) throw new Error(`No pending browser login for sessionId: ${sessionId}`);
  pendingLogins.delete(sessionId);

  const { browser, page } = pending;
  try {
    await typeIntoField(page, MFA_INPUT_SELECTOR, code);
    await submitStep(page);
    await dismissCookieBanner(page);
    await waitForLoginToComplete(page);

    return await page.cookies();
  } finally {
    await browser.close();
  }
}

export async function attemptAutoLogin(): Promise<Cookie[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await enterCredentials(page);

    const outcome = await Promise.race([
      page.waitForSelector(MFA_INPUT_SELECTOR, { timeout: SELECTOR_TIMEOUT_MS }).then(() => "mfa" as const),
      waitForLoginToComplete(page).then(() => "dashboard" as const),
    ]);

    if (outcome === "mfa") throw new MfaRequiredError();

    return await page.cookies();
  } finally {
    await browser.close();
  }
}
