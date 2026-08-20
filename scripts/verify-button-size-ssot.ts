/**
 * 업무형 우선 화면에서 과대 control height override 탐지.
 *   npm run verify:button-size-ssot
 *
 * 허용: public/login/touch 예외 allowlist
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** 이번 migration 우선 대상 (screenshot A–G) */
const PRIORITY_FILES = [
  "src/components/domain/brackets/AutoBracketGenerationPanel.tsx",
  "src/components/domain/events/EventRecordingStreamingSettings.tsx",
  "src/components/domain/events/SpectatorSettingsSection.tsx",
  "src/components/domain/events/EventApplicationFormTemplateSection.tsx",
  "src/components/domain/events/EventDivisionManager.tsx",
  "src/components/domain/events/EventDivisionForm.tsx",
  "src/components/domain/division-templates/WeightClassRowsEditor.tsx",
  "src/components/domain/courts/EventCourtManager.tsx",
  "src/components/domain/events/qr/EventQrPrintBoard.tsx",
];

/** 경로 부분 문자열 — 이 파일에서는 h-11/h-12 class override 허용 */
const ALLOWLIST_PATH_SUBSTRINGS: string[] = [
  // login / public / touch 예외는 우선 화면 목록 밖
];

const FORBIDDEN_HEIGHT =
  /\b(?:className|class)=\{?["'`][^"'`]*\b(?:h-11|h-12|min-h-11|min-h-12)\b/;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function isAllowlisted(rel: string) {
  return ALLOWLIST_PATH_SUBSTRINGS.some((s) => rel.includes(s));
}

function main() {
  const violations: string[] = [];

  for (const rel of PRIORITY_FILES) {
    if (isAllowlisted(rel)) continue;
    const src = read(rel);
    const lines = src.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (FORBIDDEN_HEIGHT.test(line)) {
        violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      }
      if (/\bsize=["']field["']/.test(line) && !line.includes("//")) {
        violations.push(`${rel}:${idx + 1}: prefer size="default" over size="field"`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `forbidden control size overrides:\n${violations.join("\n")}`,
  );

  console.log("verify:button-size-ssot: OK");
}

main();
