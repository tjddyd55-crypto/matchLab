/**
 * 경기 운영 하단 현재/다음/최근 spotlight 카드 제거 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const spotlight = read(
  "src/components/domain/operation/OperationSpotlightSection.tsx",
);
assert.ok(!spotlight.includes("현재 · 다음 · 최근"));
assert.ok(!spotlight.includes("OperationMatchHighlightCard"));
assert.ok(!spotlight.includes('title="다음 경기"'));
assert.ok(!spotlight.includes('title="최근 종료"'));
assert.ok(spotlight.includes("선택 경기"));
assert.ok(spotlight.includes("OrganizerMatchOpsPanel"));

const board = read(
  "src/components/domain/operation/OrganizerOperationBoard.tsx",
);
assert.ok(board.includes("OperationMatchListPane"));
assert.ok(board.includes("OperationSpotlightSection"));

console.log("verify:operation-no-spotlight-cards: OK");
