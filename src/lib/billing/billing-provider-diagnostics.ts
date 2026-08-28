import "server-only";

import {
  BillingProviderEnvironment,
  BillingProviderKind,
} from "@/generated/prisma";
import { isBillingEnforceAccessEnabled } from "@/lib/billing/billing-flags";
import { isBillingCredentialEncryptionConfigured } from "@/lib/billing/billing-credential-crypto";
import {
  maskClientKey,
} from "@/lib/billing/billing-key-validation";
import { resolveBillingProviderConfig } from "@/lib/billing/billing-provider-config";
import { billingProviderConfigRepository } from "@/lib/repositories/billing-provider-config.repository";
import { prisma } from "@/lib/prisma";

export type BillingProviderSlotDiagnostics = {
  environment: "TEST" | "LIVE";
  clientKeyMasked: string | null;
  clientKeyConfigured: boolean;
  secretKeyConfigured: boolean;
};

export type BillingSettingsDiagnostics = {
  connectionStatus: string;
  runtimeProvider: string;
  runtimeEnvironment: string | null;
  runtimeEnabled: boolean;
  credentialSource: string;
  encryptionKeyConfigured: boolean;
  activePlanCount: number;
  renewalSchedulerReady: boolean;
  accessGateEnforce: boolean;
  slots: BillingProviderSlotDiagnostics[];
};

function slotFromRow(
  environment: BillingProviderEnvironment,
  row: {
    clientKey: string | null;
    secretKeyCipher: Uint8Array | Buffer | null;
  } | null,
  envFallback: { client: boolean; secret: boolean },
): BillingProviderSlotDiagnostics {
  const envLabel = environment === BillingProviderEnvironment.TEST ? "TEST" : "LIVE";
  const dbClient = Boolean(row?.clientKey?.trim());
  const dbSecret = Boolean(row?.secretKeyCipher);
  const clientConfigured = dbClient || envFallback.client;
  const secretConfigured = dbSecret || envFallback.secret;
  const clientKey = row?.clientKey ?? null;

  return {
    environment: envLabel,
    clientKeyMasked: clientKey ? maskClientKey(clientKey) : null,
    clientKeyConfigured: clientConfigured,
    secretKeyConfigured: secretConfigured,
  };
}

function envFallbackFor(environment: BillingProviderEnvironment): {
  client: boolean;
  secret: boolean;
} {
  const client =
    String(
      process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ||
        process.env.TOSS_BILLING_CLIENT_KEY ||
        "",
    ).trim() || "";
  const secret = String(process.env.TOSS_BILLING_SECRET_KEY || "").trim() || "";
  if (environment === BillingProviderEnvironment.TEST) {
    return {
      client: Boolean(client) && /^test_/i.test(client),
      secret: Boolean(secret) && /^test_/i.test(secret),
    };
  }
  return {
    client: Boolean(client) && /^live_/i.test(client),
    secret: Boolean(secret) && /^live_/i.test(secret),
  };
}

export async function getBillingSettingsDiagnostics(): Promise<BillingSettingsDiagnostics> {
  const [runtime, providerRows, activePlanCount, resolved] = await Promise.all([
    billingProviderConfigRepository.getRuntimeConfig(),
    billingProviderConfigRepository.listProviderConfigs(),
    prisma.billingPlan.count({ where: { isActive: true } }),
    resolveBillingProviderConfig(),
  ]);

  const testRow =
    providerRows.find(
      (r) =>
        r.provider === BillingProviderKind.TOSS &&
        r.environment === BillingProviderEnvironment.TEST,
    ) ?? null;
  const liveRow =
    providerRows.find(
      (r) =>
        r.provider === BillingProviderKind.TOSS &&
        r.environment === BillingProviderEnvironment.LIVE,
    ) ?? null;

  const slots = [
    slotFromRow(
      BillingProviderEnvironment.TEST,
      testRow,
      envFallbackFor(BillingProviderEnvironment.TEST),
    ),
    slotFromRow(
      BillingProviderEnvironment.LIVE,
      liveRow,
      envFallbackFor(BillingProviderEnvironment.LIVE),
    ),
  ];

  const cronSecret = Boolean(
    String(process.env.MATCHON_BILLING_CRON_SECRET ?? "").trim(),
  );

  return {
    connectionStatus: resolved.connectionStatus,
    runtimeProvider:
      runtime.provider === BillingProviderKind.TOSS
        ? "Toss Payments"
        : "미설정",
    runtimeEnvironment: runtime.environment,
    runtimeEnabled: runtime.enabled,
    credentialSource: resolved.credentialSource,
    encryptionKeyConfigured: isBillingCredentialEncryptionConfigured(),
    activePlanCount,
    renewalSchedulerReady: cronSecret,
    accessGateEnforce: isBillingEnforceAccessEnabled(),
    slots,
  };
}

export function formatConnectionStatusLabel(status: string): string {
  switch (status) {
    case "ENABLED":
      return "연결 활성";
    case "READY":
      return "연결 준비 완료";
    case "PARTIAL":
      return "일부만 설정됨";
    default:
      return "미설정";
  }
}

export function providerSlotStatus(slot: BillingProviderSlotDiagnostics): {
  clientLabel: string;
  secretLabel: string;
} {
  return {
    clientLabel: slot.clientKeyConfigured
      ? slot.clientKeyMasked ?? "등록됨"
      : "미등록",
    secretLabel: slot.secretKeyConfigured ? "등록됨" : "미등록",
  };
}
