import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { JUDGE_SESSION_COOKIE } from "@/lib/constants/judge-session";

export type JudgeSessionPayload = {
  credentialId: string;
  eventId: string;
  exp: number;
};

function sessionSecret(): string {
  return (
    process.env.JUDGE_SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-judge-session-secret"
  );
}

function signPayload(encoded: string): string {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

export function createJudgeSessionToken(
  payload: Omit<JudgeSessionPayload, "exp">,
  ttlMs = 1000 * 60 * 60 * 12,
): string {
  const body: JudgeSessionPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function parseJudgeSessionToken(token: string): JudgeSessionPayload | null {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = signPayload(encoded);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const body = JSON.parse(json) as JudgeSessionPayload;
    if (!body.credentialId || !body.eventId || typeof body.exp !== "number") {
      return null;
    }
    if (body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export async function readJudgeSession(): Promise<JudgeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JUDGE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseJudgeSessionToken(token);
}

export async function setJudgeSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(JUDGE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearJudgeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(JUDGE_SESSION_COOKIE);
}
