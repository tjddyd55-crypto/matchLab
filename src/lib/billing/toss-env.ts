import "server-only";

import {
  getBillingProviderCredentials,
  resolveBillingProviderConfig,
} from "@/lib/billing/billing-provider-config";

export type TossBillingEnv = {
  provider: "toss" | "none";
  clientKey: string | null;
  secretKey: string | null;
  isTestKey: boolean;
  pgReady: boolean;
  enabled: boolean;
  environment: "TEST" | "LIVE" | null;
  liveBlocked: boolean;
};

/**
 * Toss Billing keys — Admin DB 우선, env fallback.
 * Secret: server only — never NEXT_PUBLIC.
 */
export async function getTossBillingEnv(): Promise<TossBillingEnv> {
  const cfg = await resolveBillingProviderConfig();
  return {
    provider: cfg.provider,
    clientKey: cfg.clientKey,
    secretKey: cfg.secretKey,
    isTestKey: cfg.isTestKey,
    pgReady: cfg.pgReady,
    enabled: cfg.enabled,
    environment: cfg.environment,
    liveBlocked: false,
  };
}

export async function assertTossSecretConfigured(): Promise<{
  clientKey: string;
  secretKey: string;
  isTestKey: boolean;
}> {
  const creds = await getBillingProviderCredentials();
  if (!creds) {
    throw new Error(
      "Toss Billing이 설정되지 않았습니다. 관리자 → 결제 설정에서 키를 등록하고 연동을 활성화하세요.",
    );
  }
  return creds;
}

export function tossBasicAuthHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}
