import { Schema, model } from "mongoose";

const oauthTokenSchema = new Schema(
  {
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
  },
  { versionKey: false, timestamps: true }
);

export const OAuthToken = model("OAuthToken", oauthTokenSchema);

export async function getStoredToken() {
  return OAuthToken.findOne().sort({ createdAt: -1 });
}

export async function saveToken(data: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}) {
  await OAuthToken.deleteMany({});
  return OAuthToken.create(data);
}

export async function clearToken() {
  await OAuthToken.deleteMany({});
}
