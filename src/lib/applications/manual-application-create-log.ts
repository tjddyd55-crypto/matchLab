import { sanitizePiiForLog } from "@/lib/athlete-application/sanitize-pii-log";

const LOG_PREFIX = "[manual-application-create]";

export function logManualApplicationCreate(
  step: string,
  data?: Record<string, unknown>,
): void {
  console.info(LOG_PREFIX, step, sanitizePiiForLog(data ?? {}));
}

export function logManualApplicationCreateError(
  step: string,
  data?: Record<string, unknown>,
): void {
  console.error(LOG_PREFIX, step, sanitizePiiForLog(data ?? {}));
}

export function maskPhoneLast4(phone?: string | null): string | undefined {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 4) return undefined;
  return digits.slice(-4);
}
