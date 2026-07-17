/**
 * 경기 목록 카드 전체 tone + selected/focus SSOT 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const display = read("src/lib/operation-match-list-display.ts");
assert.ok(display.includes("#FFFBEB"));
assert.ok(display.includes("#EFF6FF"));
assert.ok(display.includes("#F1F5F9"));
assert.ok(display.includes("#FFF1F2"));
assert.ok(display.includes("#F59E0B"));
assert.ok(display.includes("#3B82F6"));
assert.ok(display.includes("getSelectableListCardClass"));

const selectable = read("src/lib/ui/selectable-list-card.ts");
assert.ok(selectable.includes("focus-visible:ring-2"));
assert.ok(selectable.includes("0_0_0_4px"));
assert.ok(selectable.includes("getSelectableListCardClass"));

const pane = read(
  "src/components/domain/operation/OperationMatchListPane.tsx",
);
assert.ok(pane.includes("getOperationMatchListCardToneClass"));

console.log("verify:operation-match-card-tone: OK");
console.log("verify:selected-list-card-focus: OK");
