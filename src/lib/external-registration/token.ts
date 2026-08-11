import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";

const TOKEN_BYTES = 24;
const SIG_HEX_LEN = 32;

function signingSecret(): string {
  const secret =
    process.env.EXTERNAL_REGISTRATION_URL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.MEMBER_GYM_JOIN_URL_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EXTERNAL_REGISTRATION_URL_SECRET 또는 AUTH_SECRET이 필요합니다.",
      );
    }
    return "dev-external-registration-url-secret";
  }
  return secret;
}

export function generateExternalRegistrationRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashExternalRegistrationToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function buildExternalRegistrationPublicToken(
  linkId: string,
  tokenHash: string,
): string {
  const sig = createHmac("sha256", signingSecret())
    .update(`external-reg:${linkId}:${tokenHash}`, "utf8")
    .digest("hex")
    .slice(0, SIG_HEX_LEN);
  return `${linkId}.${sig}`;
}

export function parseExternalRegistrationPublicToken(
  token: string,
): { linkId: string; signature: string } | null {
  const raw = token.trim();
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const linkId = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!linkId || signature.length !== SIG_HEX_LEN) return null;
  if (!/^[a-z0-9]+$/i.test(linkId)) return null;
  return { linkId, signature };
}

export function verifyExternalRegistrationPublicToken(input: {
  linkId: string;
  tokenHash: string;
  signature: string;
}): boolean {
  const expected = buildExternalRegistrationPublicToken(
    input.linkId,
    input.tokenHash,
  );
  const a = Buffer.from(expected.split(".")[1] ?? "", "utf8");
  const b = Buffer.from(input.signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildExternalRegistrationPublicUrl(
  linkId: string,
  tokenHash: string,
): string {
  const token = buildExternalRegistrationPublicToken(linkId, tokenHash);
  return `${getAppBaseUrl().replace(/\/$/, "")}/external/event-registration/${encodeURIComponent(token)}`;
}
