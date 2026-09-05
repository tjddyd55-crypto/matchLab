import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 현장 운영 포털 — 32 bytes entropy, base64url */
const TOKEN_BYTES = 32;

export function generateOnsiteOpsToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashOnsiteOpsToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function onsiteOpsTokensEqual(
  plainToken: string,
  tokenHash: string,
): boolean {
  const hashed = Buffer.from(hashOnsiteOpsToken(plainToken), "utf8");
  const expected = Buffer.from(tokenHash, "utf8");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}

export function buildOnsiteOpsPortalPath(token: string): string {
  return `/ops/${encodeURIComponent(token.trim())}`;
}

export function buildOnsiteOpsPortalUrl(token: string, origin?: string): string {
  const path = buildOnsiteOpsPortalPath(token);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export type OnsiteOpsTab = "weighin" | "matches";

export function parseOnsiteOpsTab(value: string | null | undefined): OnsiteOpsTab {
  if (value === "matches" || value === "match-ops") return "matches";
  return "weighin";
}

export function onsiteOpsTabHref(token: string, tab: OnsiteOpsTab): string {
  const base = buildOnsiteOpsPortalPath(token);
  if (tab === "weighin") return `${base}?tab=weighin`;
  return `${base}?tab=matches`;
}
