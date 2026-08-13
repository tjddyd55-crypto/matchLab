/**
 * AES-256-GCM PII encryption SSOT.
 * Key: MATCHON_PII_ENCRYPTION_KEY (32-byte hex or base64). Never log plaintext.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const MATCHON_PII_ENCRYPTION_KEY_ENV = "MATCHON_PII_ENCRYPTION_KEY";
export const MATCHON_PII_KEY_VERSION_V1 = "v1";

export type EncryptedPiiBlob = {
  cipher: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  keyVer: string;
};

export function isPiiEncryptionKeyConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env[MATCHON_PII_ENCRYPTION_KEY_ENV]?.trim());
}

export function parsePiiEncryptionKey(
  raw: string | undefined | null,
): Buffer {
  const value = raw?.trim() ?? "";
  if (!value) {
    throw new Error(
      `${MATCHON_PII_ENCRYPTION_KEY_ENV} is not configured`,
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  const fromB64 = Buffer.from(value, "base64");
  if (fromB64.length === 32) return fromB64;
  throw new Error(
    `${MATCHON_PII_ENCRYPTION_KEY_ENV} must be 32-byte hex or base64`,
  );
}

function loadKey(): Buffer {
  return parsePiiEncryptionKey(process.env[MATCHON_PII_ENCRYPTION_KEY_ENV]);
}

export function encryptPiiUtf8(plain: string): EncryptedPiiBlob {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return {
    cipher: Uint8Array.from(encrypted),
    iv: Uint8Array.from(iv),
    authTag: Uint8Array.from(cipher.getAuthTag()),
    keyVer: MATCHON_PII_KEY_VERSION_V1,
  };
}

export function decryptPiiUtf8(blob: EncryptedPiiBlob): string {
  const key = loadKey();
  const decipher = createDecipheriv("aes-256-gcm", key, blob.iv);
  decipher.setAuthTag(Buffer.from(blob.authTag));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.cipher)),
    decipher.final(),
  ]).toString("utf8");
}
