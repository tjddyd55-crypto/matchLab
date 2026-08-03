import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function generateMatchonOtpCode(length: number): string {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, "0");
}

export function hashMatchonOtpCode(input: {
  code: string;
  purpose: string;
  phoneNormalized: string;
  pepper: string;
}): string {
  return createHmac("sha256", input.pepper)
    .update(
      `${input.code}|${input.purpose}|${input.phoneNormalized}`,
      "utf8",
    )
    .digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function generateMatchonVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMatchonVerificationToken(
  token: string,
  pepper: string,
): string {
  return createHmac("sha256", pepper)
    .update(`vt|${token}`, "utf8")
    .digest("hex");
}

export function hashMatchonRequestIp(ip: string | null | undefined): string | null {
  const v = (ip ?? "").trim();
  if (!v) return null;
  return createHash("sha256").update(`ip|${v}`, "utf8").digest("hex");
}
