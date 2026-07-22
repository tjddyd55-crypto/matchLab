/** secret / credential 마스킹 — 원문·prefix 노출 금지 */

export function maskMatchonSecret(value: string | null | undefined): string {
  const v = String(value ?? "").trim();
  if (!v) return "(없음)";
  return "(설정됨)";
}

export function presenceOnly(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

export function summarizeProviderPayload(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") {
    return input.length > 120 ? `${input.slice(0, 120)}…` : input;
  }
  try {
    const json = JSON.stringify(input);
    const redacted = json
      .replace(/"(key|api_key|apikey|senderkey|sender_key|token|password)"\s*:\s*"[^"]*"/gi, '"$1":"***"')
      .replace(/"(receiver|phone|msg|message|subject)"\s*:\s*"[^"]*"/gi, '"$1":"(redacted)"');
    return redacted.length > 240 ? `${redacted.slice(0, 240)}…` : redacted;
  } catch {
    return "(unserializable)";
  }
}
