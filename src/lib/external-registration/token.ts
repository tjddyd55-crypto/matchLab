import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";

const TOKEN_BYTES = 24;
const SIG_HEX_LEN = 32;

/**
 * 등록 링크 HMAC signing secret SSOT.
 * Preview/Production/local 모두 동일 env 우선순위를 써야 한다.
 * QA 스크립트가 별도 secret을 재구현하거나 로컬 .env로 Preview 검증을 우회하면 안 된다.
 */
export function getExternalRegistrationSigningSecret(): string {
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

/**
 * Public token = `${linkId}.${hmac}` — create/verify 동일 helper.
 * raw seed token은 DB에 저장하지 않고 tokenHash만 보관한다.
 */
export function buildExternalRegistrationPublicToken(
  linkId: string,
  tokenHash: string,
): string {
  const sig = createHmac("sha256", getExternalRegistrationSigningSecret())
    .update(`external-reg:${linkId}:${tokenHash}`, "utf8")
    .digest("hex")
    .slice(0, SIG_HEX_LEN);
  return `${linkId}.${sig}`;
}

/** SSOT alias — 생성/검증 문서용 */
export const createRegistrationPublicToken = buildExternalRegistrationPublicToken;

export function parseExternalRegistrationPublicToken(
  token: string,
): { linkId: string; signature: string } | null {
  const raw = token.trim();
  // Next.js params / encodeURIComponent 이중 디코드 방어
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const dot = decoded.indexOf(".");
  if (dot <= 0) return null;
  const linkId = decoded.slice(0, dot);
  const signature = decoded.slice(dot + 1);
  if (!linkId || signature.length !== SIG_HEX_LEN) return null;
  if (!/^[a-z0-9]+$/i.test(linkId)) return null;
  if (!/^[a-f0-9]+$/i.test(signature)) return null;
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
  const expectedSig = expected.split(".")[1] ?? "";
  const a = Buffer.from(expectedSig, "utf8");
  const b = Buffer.from(input.signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** SSOT alias */
export const verifyRegistrationPublicToken = verifyExternalRegistrationPublicToken;

export function buildExternalRegistrationPublicUrl(
  linkId: string,
  tokenHash: string,
): string {
  const token = buildExternalRegistrationPublicToken(linkId, tokenHash);
  return `${getAppBaseUrl().replace(/\/$/, "")}/external/event-registration/${encodeURIComponent(token)}`;
}
