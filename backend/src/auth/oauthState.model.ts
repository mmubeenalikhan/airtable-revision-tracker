import { Schema, model } from "mongoose";

const oauthStateSchema = new Schema(
  {
    state: { type: String, required: true, unique: true },
    codeVerifier: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 },
  },
  { versionKey: false }
);

export const OAuthState = model("OAuthState", oauthStateSchema);
