import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "prompt-shield-review";
const SESSION_SECONDS = 60 * 60 * 4;

interface ReviewSession {
  assetIds: string[];
  expiresAt: number;
}

function getSecret() {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DEMO_SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encodeSession(session: ReviewSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value?: string): ReviewSession | null {
  if (!value) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature) return null;

  const expectedSignature = sign(payload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReviewSession;
    if (!Array.isArray(parsed.assetIds) || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function grantReviewAccess(assetId: string) {
  const cookieStore = await cookies();
  const current = decodeSession(cookieStore.get(COOKIE_NAME)?.value);
  const assetIds = [...new Set([...(current?.assetIds ?? []), assetId])].slice(-12);
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;

  cookieStore.set(COOKIE_NAME, encodeSession({ assetIds, expiresAt }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function canReviewAsset(assetId: string) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(COOKIE_NAME)?.value);
  return session?.assetIds.includes(assetId) ?? false;
}
