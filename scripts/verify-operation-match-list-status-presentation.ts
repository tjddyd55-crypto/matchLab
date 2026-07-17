/**
 * 경기 운영 목록 상태 표현 SSOT 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const display = read("src/lib/operation-match-list-display.ts");
assert.ok(display.includes("getOperationMatchListDisplay"));
assert.ok(display.includes("getOperationMatchListCardToneClass"));
assert.ok(display.includes("preparing"));
assert.ok(display.includes("in_progress"));
assert.ok(display.includes("#F1F5F9"));

const pane = read(
  "src/components/domain/operation/OperationMatchListPane.tsx",
);
assert.ok(pane.includes("getOperationMatchListDisplay"));
assert.ok(!pane.includes("ChevronRight"));
assert.ok(!pane.includes("보조 경기"));
assert.ok(!pane.includes("OrganizerOperationStatusBadges"));

console.log("verify:operation-match-list-status-presentation: OK");
