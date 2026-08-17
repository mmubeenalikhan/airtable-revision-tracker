import { env } from "../config/env";
import { getStoredToken, saveToken } from "./oauthToken.model";

const TOKEN_URL = "https://airtable.com/oauth2/v1/token";
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

function basicAuthHeader(): string {
  const credentials = `${env.airtable.clientId}:${env.airtable.clientSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

async function requestToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable token request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }>;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.airtable.redirectUri,
    client_id: env.airtable.clientId,
    code_verifier: codeVerifier,
  });

  const data = await requestToken(body);

  return saveToken({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  });
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.airtable.clientId,
  });

  const data = await requestToken(body);

  return saveToken({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  });
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = await getStoredToken();
  if (!stored) return null;

  const isExpiringSoon = stored.expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS < Date.now();
  if (!isExpiringSoon) return stored.accessToken;

  const refreshed = await refreshAccessToken(stored.refreshToken);
  return refreshed.accessToken;
}

export async function isConnected(): Promise<boolean> {
  const stored = await getStoredToken();
  return stored !== null;
}
