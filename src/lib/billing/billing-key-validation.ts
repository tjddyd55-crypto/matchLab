/**
 * Toss Billing key prefix / environment consistency validation.
 * Prefix rules follow Toss Payments official key format (test_* / live_*).
 */

export type BillingKeyEnvironment = "TEST" | "LIVE";

const TEST_PREFIXES = ["test_ck_", "test_sk_"] as const;
const LIVE_PREFIXES = ["live_ck_", "live_sk_"] as const;

export function isTestKeyPrefix(key: string): boolean {
  return /^test_/i.test(key.trim());
}

export function isLiveKeyPrefix(key: string): boolean {
  return /^live_/i.test(key.trim());
}

export function expectedClientKeyPrefix(env: BillingKeyEnvironment): string {
  return env === "TEST" ? "test_ck_" : "live_ck_";
}

export function expectedSecretKeyPrefix(env: BillingKeyEnvironment): string {
  return env === "TEST" ? "test_sk_" : "live_sk_";
}

export function validateClientKeyForEnvironment(
  clientKey: string,
  environment: BillingKeyEnvironment,
): string | null {
  const v = clientKey.trim();
  if (!v) return "Client Key를 입력하세요.";
  const expected = expectedClientKeyPrefix(environment);
  if (!v.toLowerCase().startsWith(expected)) {
    return `${environment} 환경에는 ${expected}로 시작하는 Client Key만 사용할 수 있습니다.`;
  }
  if (environment === "TEST" && isLiveKeyPrefix(v)) {
    return "TEST 환경에 LIVE Client Key를 사용할 수 없습니다.";
  }
  if (environment === "LIVE" && isTestKeyPrefix(v)) {
    return "LIVE 환경에 TEST Client Key를 사용할 수 없습니다.";
  }
  return null;
}

export function validateSecretKeyForEnvironment(
  secretKey: string,
  environment: BillingKeyEnvironment,
): string | null {
  const v = secretKey.trim();
  if (!v) return "Secret Key를 입력하세요.";
  const expected = expectedSecretKeyPrefix(environment);
  if (!v.toLowerCase().startsWith(expected)) {
    return `${environment} 환경에는 ${expected}로 시작하는 Secret Key만 사용할 수 있습니다.`;
  }
  if (environment === "TEST" && isLiveKeyPrefix(v)) {
    return "TEST 환경에 LIVE Secret Key를 사용할 수 없습니다.";
  }
  if (environment === "LIVE" && isTestKeyPrefix(v)) {
    return "LIVE 환경에 TEST Secret Key를 사용할 수 없습니다.";
  }
  return null;
}

/** Client + secret pair must belong to the same environment family. */
export function validateKeyPairConsistency(
  clientKey: string,
  secretKey: string,
): string | null {
  const ckTest = isTestKeyPrefix(clientKey);
  const skTest = isTestKeyPrefix(secretKey);
  const ckLive = isLiveKeyPrefix(clientKey);
  const skLive = isLiveKeyPrefix(secretKey);
  if (ckTest && skTest) return null;
  if (ckLive && skLive) return null;
  return "Client Key와 Secret Key의 환경(TEST/LIVE)이 일치하지 않습니다.";
}

export function maskClientKey(clientKey: string | null | undefined): string | null {
  const v = String(clientKey ?? "").trim();
  if (!v) return null;
  if (v.length <= 10) return `${v.slice(0, 4)}****`;
  return `${v.slice(0, 7)}****${v.slice(-4)}`;
}

export type BillingConnectionStatus =
  | "NOT_CONFIGURED"
  | "PARTIAL"
  | "READY"
  | "ENABLED";

export function computeConnectionStatus(input: {
  clientKeyPresent: boolean;
  secretKeyPresent: boolean;
  enabled: boolean;
}): BillingConnectionStatus {
  if (input.enabled && input.clientKeyPresent && input.secretKeyPresent) {
    return "ENABLED";
  }
  if (input.clientKeyPresent && input.secretKeyPresent) {
    return "READY";
  }
  if (input.clientKeyPresent || input.secretKeyPresent) {
    return "PARTIAL";
  }
  return "NOT_CONFIGURED";
}
