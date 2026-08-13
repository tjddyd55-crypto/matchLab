import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { encryptPiiUtf8 } from "@/lib/crypto/pii-aes";
import {
  parseResidentRegistrationNumber,
} from "@/lib/athlete-application/resident-registration-number";

export function encryptInsuranceResidentNumber(raw: string): {
  cipher: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  keyVer: string;
  masked: string;
} {
  const parsed = parseResidentRegistrationNumber(raw);
  if (!parsed.ok) {
    throw new AppError("VALIDATION_ERROR", parsed.error);
  }
  try {
    const blob = encryptPiiUtf8(parsed.digits);
    return { ...blob, masked: parsed.masked };
  } catch {
    throw new AppError(
      "INTERNAL",
      "보험 개인정보 암호화 키가 설정되지 않았습니다.",
    );
  }
}
