import "server-only";

import {
  decryptPiiUtf8,
  encryptPiiUtf8,
  isPiiEncryptionKeyConfigured,
  MATCHON_PII_ENCRYPTION_KEY_ENV,
  type EncryptedPiiBlob,
} from "@/lib/crypto/pii-aes";

export { isPiiEncryptionKeyConfigured as isBillingCredentialEncryptionConfigured };
export { MATCHON_PII_ENCRYPTION_KEY_ENV as BILLING_CREDENTIAL_ENCRYPTION_KEY_ENV };

export function assertBillingCredentialEncryptionConfigured(): void {
  if (!isPiiEncryptionKeyConfigured()) {
    throw new Error(
      `${MATCHON_PII_ENCRYPTION_KEY_ENV}가 설정되지 않아 Secret Key를 저장할 수 없습니다.`,
    );
  }
}

export function encryptBillingSecret(plain: string): EncryptedPiiBlob {
  assertBillingCredentialEncryptionConfigured();
  return encryptPiiUtf8(plain);
}

export function decryptBillingSecret(blob: EncryptedPiiBlob): string {
  assertBillingCredentialEncryptionConfigured();
  return decryptPiiUtf8(blob);
}

export function encryptedBlobFromDb(row: {
  secretKeyCipher: Uint8Array | Buffer | null;
  secretKeyIv: Uint8Array | Buffer | null;
  secretKeyAuthTag: Uint8Array | Buffer | null;
  secretKeyKeyVer: string | null;
}): EncryptedPiiBlob | null {
  if (
    !row.secretKeyCipher ||
    !row.secretKeyIv ||
    !row.secretKeyAuthTag ||
    !row.secretKeyKeyVer
  ) {
    return null;
  }
  return {
    cipher: Uint8Array.from(row.secretKeyCipher),
    iv: Uint8Array.from(row.secretKeyIv),
    authTag: Uint8Array.from(row.secretKeyAuthTag),
    keyVer: row.secretKeyKeyVer,
  };
}
