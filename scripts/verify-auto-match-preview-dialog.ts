/**
 * verify:auto-match-preview-dialog
 * 미리보기 → inline panel 없이 바로 Preview Dialog
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const panel = read("src/components/domain/brackets/AutoBracketGenerationPanel.tsx");
assert.ok(panel.includes("AutoBracketPreviewDialog"));
assert.ok(panel.includes("previewDialogOpen"));
assert.ok(panel.includes("setPreviewDialogOpen(true)"));
assert.ok(!panel.includes("미매칭 상세 미리보기"));
assert.ok(!panel.includes("tone={preview"));
assert.ok(panel.includes("ApplySummaryBlock") || panel.includes("자동 대진 생성 완료"));

const dialog = read(
  "src/components/domain/brackets/UnmatchedAutoMatchDetailDialog.tsx",
);
assert.ok(dialog.includes("export function AutoBracketPreviewDialog"));
assert.ok(dialog.includes("자동대진 미리보기"));
assert.ok(dialog.includes("생성 예정 경기와 미매칭"));
assert.ok(dialog.includes("max-w-7xl"));
assert.ok(dialog.includes("max-h-[88dvh]"));

console.log("verify:auto-match-preview-dialog: OK");
