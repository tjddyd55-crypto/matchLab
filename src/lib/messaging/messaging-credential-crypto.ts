import "server-only";

import {
  decryptBillingSecret,
  encryptBillingSecret,
  encryptedBlobFromDb,
  isBillingCredentialEncryptionConfigured,
  assertBillingCredentialEncryptionConfigured,
} from "@/lib/billing/billing-credential-crypto";

export {
  isBillingCredentialEncryptionConfigured as isMessagingCredentialEncryptionConfigured,
  assertBillingCredentialEncryptionConfigured as assertMessagingCredentialEncryptionConfigured,
};

export function encryptMessagingApiKey(plain: string) {
  return encryptBillingSecret(plain);
}

export function decryptMessagingApiKey(
  row: {
    apiKeyCipher: Uint8Array | Buffer | null;
    apiKeyIv: Uint8Array | Buffer | null;
    apiKeyAuthTag: Uint8Array | Buffer | null;
    apiKeyKeyVer: string | null;
  },
): string | null {
  const blob = encryptedBlobFromDb({
    secretKeyCipher: row.apiKeyCipher,
    secretKeyIv: row.apiKeyIv,
    secretKeyAuthTag: row.apiKeyAuthTag,
    secretKeyKeyVer: row.apiKeyKeyVer,
  });
  if (!blob) return null;
  return decryptBillingSecret(blob);
}

export function maskMessagingApiKeyHint(apiKey: string | null | undefined): string {
  if (!apiKey?.trim()) return "미설정";
  const tail = apiKey.slice(-4);
  return `********${tail}`;
}
