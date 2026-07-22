import { createHash } from "node:crypto";
import type {
  MatchonTemplateButton,
  MatchonTemplateVariableSchema,
} from "../domain/matchon-message-types";

function normalizePlaceholders(body: string): string[] {
  const keys = new Set<string>();
  const re = /\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    keys.add(m[1].trim());
  }
  return [...keys].sort();
}

function normalizeButtons(buttons: MatchonTemplateButton[] | null | undefined) {
  if (!buttons?.length) return [];
  return buttons.map((b) => ({
    name: String(b.name ?? "").trim(),
    type: String(b.type ?? "").trim(),
    url: String(b.url ?? b.urlMobile ?? b.urlPc ?? "").replace(/\{[^}]+\}/g, "{VAR}"),
  }));
}

/**
 * 승인 시점 알림톡 원문 fingerprint.
 * body placeholder 구조 + button 타입/이름/URL 구조.
 */
export function computeMatchonTemplateFingerprint(input: {
  body: string;
  variables?: MatchonTemplateVariableSchema | null;
  buttons?: MatchonTemplateButton[] | null;
}): string {
  const payload = {
    body: String(input.body ?? "").replace(/\r\n/g, "\n").trim(),
    placeholders: normalizePlaceholders(String(input.body ?? "")),
    variableKeys: Object.keys(input.variables ?? {}).sort(),
    buttons: normalizeButtons(input.buttons),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isMatchonTemplateFingerprintMatch(params: {
  currentFingerprint: string;
  approvedFingerprint: string | null | undefined;
}): boolean {
  const approved = String(params.approvedFingerprint ?? "").trim();
  if (!approved) return false;
  return approved === params.currentFingerprint;
}
