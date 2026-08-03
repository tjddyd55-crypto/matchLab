import "server-only";

import {
  isMatchonProductionRuntime,
  type MatchonPhoneVerificationConfig,
} from "../config/matchon-phone-verification-config";

type InboxEntry = {
  requestId: string;
  phoneNormalized: string;
  purpose: string;
  code: string;
  createdAt: string;
};

const g = globalThis as unknown as {
  __matchonAuthSmsE2eInbox?: Map<string, InboxEntry>;
};

function inbox(): Map<string, InboxEntry> {
  if (!g.__matchonAuthSmsE2eInbox) {
    g.__matchonAuthSmsE2eInbox = new Map();
  }
  return g.__matchonAuthSmsE2eInbox;
}

export function isMatchonAuthSmsE2eInboxAllowed(
  config: MatchonPhoneVerificationConfig,
): boolean {
  if (isMatchonProductionRuntime()) return false;
  if (!config.e2eInboxEnabled) return false;
  if (config.provider !== "mock") return false;
  return true;
}

export function putMatchonAuthSmsE2eCode(
  config: MatchonPhoneVerificationConfig,
  entry: Omit<InboxEntry, "createdAt">,
): void {
  if (!isMatchonAuthSmsE2eInboxAllowed(config)) return;
  inbox().set(entry.requestId, {
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

export function getMatchonAuthSmsE2eCode(
  config: MatchonPhoneVerificationConfig,
  requestId: string,
): InboxEntry | null {
  if (!isMatchonAuthSmsE2eInboxAllowed(config)) return null;
  return inbox().get(requestId) ?? null;
}

export function clearMatchonAuthSmsE2eInbox(): void {
  inbox().clear();
}
