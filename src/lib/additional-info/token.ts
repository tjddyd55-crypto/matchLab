import { createHash, randomBytes } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";

const TOKEN_BYTES = 32;

/** Opaque raw token (URL only). Never store raw in DB. */
export function generateAdditionalInfoRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** SHA-256 hex for DB storage. */
export function hashAdditionalInfoToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}

/** Public form URL — opaque token in path only (no PII). */
export function buildAdditionalInfoPublicUrl(rawToken: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/application-info/${encodeURIComponent(rawToken.trim())}`;
}
