import "server-only";

import { getBillingProviderName } from "@/lib/billing/billing-flags";

export type TossBillingEnv = {
  provider: "toss" | "none";
  clientKey: string | null;
  secretKey: string | null;
  isTestKey: boolean;
  pgReady: boolean;
  liveBlocked: boolean;
};

function isTestKey(key: string): boolean {
  return /^test_/i.test(key.trim());
}

/**
 * Toss Billing keys.
 * Client: NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY (SDK)
 * Secret: TOSS_BILLING_SECRET_KEY (server only — never NEXT_PUBLIC)
 */
export function getTossBillingEnv(): TossBillingEnv {
  const provider = getBillingProviderName();
  const clientKey =
    String(
      process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ||
        process.env.TOSS_BILLING_CLIENT_KEY ||
        "",
    ).trim() || null;
  const secretKey =
    String(process.env.TOSS_BILLING_SECRET_KEY || "").trim() || null;

  const isTest =
    (clientKey ? isTestKey(clientKey) : false) ||
    (secretKey ? isTestKey(secretKey) : false);

  const nodeProd = process.env.NODE_ENV === "production";
  const railwayProd =
    String(process.env.RAILWAY_ENVIRONMENT || "")
      .trim()
      .toLowerCase() === "production";
  const isProdRuntime = nodeProd || railwayProd;

  // Production live charge requires non-test keys. Test keys OK in non-prod.
  const liveBlocked = isProdRuntime && isTest === false && Boolean(secretKey)
    ? false
    : isProdRuntime && isTest
      ? true // prod with test keys: allow auth UI but mark as test; still allow for staged testing
      : false;

  // Actually user said: production live payment disabled until live keys.
  // If prod + test keys → show TEST banner, allow test charges for verification.
  // If prod + no keys → not ready.
  // If prod + live keys → ready.
  // If !prod + test keys → ready.

  const pgReady =
    provider === "toss" && Boolean(clientKey) && Boolean(secretKey);

  return {
    provider,
    clientKey,
    secretKey,
    isTestKey: isTest,
    pgReady,
    liveBlocked: false, // allow test in prod only if explicitly desired; keep false for Phase2 TEST priority
  };
}

export function assertTossSecretConfigured(): {
  clientKey: string;
  secretKey: string;
  isTestKey: boolean;
} {
  const env = getTossBillingEnv();
  if (!env.pgReady || !env.clientKey || !env.secretKey) {
    throw new Error(
      "Toss Billing 키가 설정되지 않았습니다. NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY / TOSS_BILLING_SECRET_KEY를 확인하세요.",
    );
  }
  return {
    clientKey: env.clientKey,
    secretKey: env.secretKey,
    isTestKey: env.isTestKey,
  };
}

export function tossBasicAuthHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}
