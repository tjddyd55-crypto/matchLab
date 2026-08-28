import "server-only";

import {
  BillingProviderEnvironment,
  BillingProviderKind,
} from "@/generated/prisma";
import {
  decryptBillingSecret,
  encryptedBlobFromDb,
  isBillingCredentialEncryptionConfigured,
} from "@/lib/billing/billing-credential-crypto";
import {
  computeConnectionStatus,
  isTestKeyPrefix,
  type BillingConnectionStatus,
} from "@/lib/billing/billing-key-validation";
import { getBillingProviderName } from "@/lib/billing/billing-flags";
import { billingProviderConfigRepository } from "@/lib/repositories/billing-provider-config.repository";

export type ResolvedBillingProviderConfig = {
  provider: "none" | "toss";
  environment: "TEST" | "LIVE" | null;
  enabled: boolean;
  clientKey: string | null;
  secretKey: string | null;
  isTestKey: boolean;
  pgReady: boolean;
  credentialSource: "db" | "env" | "none";
  connectionStatus: BillingConnectionStatus;
};

export type BillingPublicConfig = {
  provider: "none" | "toss";
  enabled: boolean;
  environment: "TEST" | "LIVE" | null;
  clientKey: string | null;
  isTestKey: boolean;
};

let cached: ResolvedBillingProviderConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15_000;

export function invalidateBillingProviderConfigCache(): void {
  cached = null;
  cachedAt = 0;
}

function readEnvCredentials(environment: BillingProviderEnvironment | null): {
  clientKey: string | null;
  secretKey: string | null;
} {
  const clientKey =
    String(
      process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ||
        process.env.TOSS_BILLING_CLIENT_KEY ||
        "",
    ).trim() || null;
  const secretKey =
    String(process.env.TOSS_BILLING_SECRET_KEY || "").trim() || null;

  if (!clientKey || !secretKey) {
    return { clientKey: null, secretKey: null };
  }

  if (environment === BillingProviderEnvironment.TEST) {
    if (!isTestKeyPrefix(clientKey) || !isTestKeyPrefix(secretKey)) {
      return { clientKey: null, secretKey: null };
    }
  }
  if (environment === BillingProviderEnvironment.LIVE) {
    if (isTestKeyPrefix(clientKey) || isTestKeyPrefix(secretKey)) {
      return { clientKey: null, secretKey: null };
    }
  }

  return { clientKey, secretKey };
}

function decryptDbSecret(row: {
  secretKeyCipher: Uint8Array | Buffer | null;
  secretKeyIv: Uint8Array | Buffer | null;
  secretKeyAuthTag: Uint8Array | Buffer | null;
  secretKeyKeyVer: string | null;
}): string | null {
  const blob = encryptedBlobFromDb(row);
  if (!blob) return null;
  if (!isBillingCredentialEncryptionConfigured()) return null;
  try {
    return decryptBillingSecret(blob);
  } catch {
    return null;
  }
}

async function resolveCredentials(
  provider: BillingProviderKind,
  environment: BillingProviderEnvironment | null,
): Promise<{
  clientKey: string | null;
  secretKey: string | null;
  source: "db" | "env" | "none";
}> {
  if (provider !== BillingProviderKind.TOSS || !environment) {
    return { clientKey: null, secretKey: null, source: "none" };
  }

  const dbRow = await billingProviderConfigRepository.getProviderConfig(
    provider,
    environment,
  );
  if (dbRow?.clientKey) {
    const secret = decryptDbSecret(dbRow);
    if (secret) {
      return {
        clientKey: dbRow.clientKey,
        secretKey: secret,
        source: "db",
      };
    }
    if (dbRow.secretKeyCipher) {
      return { clientKey: dbRow.clientKey, secretKey: null, source: "db" };
    }
  }

  const envCreds = readEnvCredentials(environment);
  if (envCreds.clientKey && envCreds.secretKey) {
    return { ...envCreds, source: "env" };
  }

  if (dbRow?.clientKey) {
    return { clientKey: dbRow.clientKey, secretKey: null, source: "db" };
  }

  return { clientKey: null, secretKey: null, source: "none" };
}

export async function resolveBillingProviderConfig(): Promise<ResolvedBillingProviderConfig> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const runtime = await billingProviderConfigRepository.getRuntimeConfig();
  const envProvider = getBillingProviderName();

  let providerKind = runtime.provider;
  if (providerKind === BillingProviderKind.NONE && envProvider === "toss") {
    providerKind = BillingProviderKind.TOSS;
  }

  const provider = providerKind === BillingProviderKind.TOSS ? "toss" : "none";
  const environment = runtime.environment;
  const enabled = runtime.enabled;

  const creds = await resolveCredentials(providerKind, environment);
  const clientKey = creds.clientKey;
  const secretKey = creds.secretKey;
  const isTestKey =
    (clientKey ? isTestKeyPrefix(clientKey) : false) ||
    (secretKey ? isTestKeyPrefix(secretKey) : false);

  const pgReady =
    provider === "toss" &&
    enabled &&
    Boolean(clientKey) &&
    Boolean(secretKey);

  const connectionStatus = computeConnectionStatus({
    clientKeyPresent: Boolean(clientKey),
    secretKeyPresent: Boolean(secretKey),
    enabled,
  });

  const resolved: ResolvedBillingProviderConfig = {
    provider,
    environment,
    enabled,
    clientKey,
    secretKey,
    isTestKey,
    pgReady,
    credentialSource: creds.source,
    connectionStatus,
  };

  cached = resolved;
  cachedAt = now;
  return resolved;
}

/** Server-only credentials for Toss API calls. */
export async function getBillingProviderCredentials(): Promise<{
  clientKey: string;
  secretKey: string;
  isTestKey: boolean;
  environment: "TEST" | "LIVE" | null;
} | null> {
  const cfg = await resolveBillingProviderConfig();
  if (!cfg.pgReady || !cfg.clientKey || !cfg.secretKey) {
    return null;
  }
  return {
    clientKey: cfg.clientKey,
    secretKey: cfg.secretKey,
    isTestKey: cfg.isTestKey,
    environment: cfg.environment,
  };
}

export async function getBillingPublicConfig(): Promise<BillingPublicConfig> {
  const cfg = await resolveBillingProviderConfig();
  return {
    provider: cfg.provider,
    enabled: cfg.enabled && cfg.pgReady,
    environment: cfg.environment,
    clientKey: cfg.enabled && cfg.clientKey ? cfg.clientKey : null,
    isTestKey: cfg.isTestKey,
  };
}
