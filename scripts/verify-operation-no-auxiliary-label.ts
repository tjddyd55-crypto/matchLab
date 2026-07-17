/**
 * 경기 운영에서 보조 경기/보조 정보 라벨 제거 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const files = [
  "src/components/domain/operation/OperationMatchListPane.tsx",
  "src/components/domain/operation/OperationSpotlightSection.tsx",
  "src/components/domain/operation/OrganizerOperationBoard.tsx",
  "src/lib/operation-match-list-display.ts",
];

for (const f of files) {
  const src = read(f);
  assert.ok(!src.includes("보조 경기"), `${f} must not contain 보조 경기`);
  assert.ok(!src.includes("보조경기"), `${f} must not contain 보조경기`);
}

const spotlight = read(
  "src/components/domain/operation/OperationSpotlightSection.tsx",
);
assert.ok(!spotlight.includes("보조 정보"));
assert.ok(!spotlight.includes("현재 · 다음 · 최근"));

console.log("verify:operation-no-auxiliary-label: OK");
