/**
 * 주민번호 등 민감값이 로그/audit payload에 남지 않도록 sanitize.
 */

const RRN_DIGIT_RE = /\d{6}-?\d{7}/g;
const RRN_KEY_RE =
  /(resident|rrn|ssn|주민|insuranceRrn|residentRegistration)/i;

export function redactResidentRegistrationNumberInText(
  value: string,
): string {
  return value.replace(RRN_DIGIT_RE, "[REDACTED_RRN]");
}

export function sanitizePiiForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return redactResidentRegistrationNumberInText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePiiForLog(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (RRN_KEY_RE.test(key)) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = sanitizePiiForLog(nested);
    }
    return out;
  }
  return value;
}
