import { createHmac, timingSafeEqual } from "node:crypto";
import { isMatchonProductionRuntime } from "@/server/phone-verification/config/matchon-phone-verification-config";

/** CI Golden Browser 전용 test session — production에서 절대 활성화되지 않음 */
export function isGoldenTestAuthEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.MATCHON_GOLDEN_TEST_AUTH !== "1") return false;
  if (isMatchonProductionRuntime(env)) return false;
  if (env.GOLDEN_FLOW_CI !== "1") return false;
  return true;
}

export function isGoldenTestAuthSecretConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.MATCHON_GOLDEN_TEST_AUTH_SECRET?.trim());
}

export function assertGoldenTestAuthSecret(
  provided: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = env.MATCHON_GOLDEN_TEST_AUTH_SECRET?.trim();
  if (!expected) return false;
  const actual = provided?.trim() ?? "";
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function authSecretFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret =
    env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim() || "";
  return secret || null;
}

export function signGoldenTestSessionPayload(
  userId: string,
  exp: number,
  secret: string,
): string {
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseGoldenTestSessionToken(
  token: string,
  secret: string,
): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  if (!userId || !expRaw || !sig) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = signGoldenTestSessionPayload(userId, exp, secret);
  const expectedSig = expected.split(".")[2];
  if (!expectedSig || expectedSig.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  return { userId };
}
