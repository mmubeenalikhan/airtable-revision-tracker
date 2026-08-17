import { Response, Router } from "express";
import { env } from "../config/env";
import { deriveCodeChallenge, generateCodeVerifier, generateState } from "./pkce";
import { OAuthState } from "./oauthState.model";
import { exchangeCodeForToken } from "./tokenService";
import { clearToken } from "./oauthToken.model";

const AUTHORIZE_URL = "https://airtable.com/oauth2/v1/authorize";

export const airtableAuthRoutes = Router();

airtableAuthRoutes.get("/login", async (_req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = deriveCodeChallenge(codeVerifier);
  const state = generateState();

  await OAuthState.create({ state, codeVerifier });

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.airtable.clientId);
  url.searchParams.set("redirect_uri", env.airtable.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", env.airtable.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  res.redirect(url.toString());
});

function redirectToFrontend(res: Response, params: Record<string, string>) {
  const url = new URL(env.frontendOrigin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  res.redirect(url.toString());
}

airtableAuthRoutes.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    redirectToFrontend(res, { error: String(error) });
    return;
  }

  if (typeof code !== "string" || typeof state !== "string") {
    redirectToFrontend(res, { error: "Missing code or state" });
    return;
  }

  const stored = await OAuthState.findOneAndDelete({ state });
  if (!stored) {
    redirectToFrontend(res, { error: "Invalid or expired state" });
    return;
  }

  try {
    await exchangeCodeForToken(code, stored.codeVerifier);
    redirectToFrontend(res, { connected: "true" });
  } catch (err) {
    redirectToFrontend(res, { error: (err as Error).message });
  }
});

airtableAuthRoutes.post("/disconnect", async (_req, res) => {
  await clearToken();
  res.json({ status: "disconnected" });
});
