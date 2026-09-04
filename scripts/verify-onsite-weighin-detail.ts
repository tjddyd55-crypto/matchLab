/**
 * 현장·계체 상세 — 선택 카드, 대진 현황, 참가자 메mo.
 *   npm run verify:onsite-weighin-detail
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const selectable = read("src/lib/ui/selectable-list-card.ts");
assert.ok(selectable.includes('selectedStyle?: "ring" | "soft"'));
assert.ok(selectable.includes("border-[#0A47FF]"));
assert.ok(selectable.includes("bg-[#EAF1FF]"));

const listDisplay = read("src/lib/field-status-list-display.ts");
assert.ok(listDisplay.includes('selectedStyle: "ring"'));
assert.ok(listDisplay.includes("organizerOperationListCardDensityClass"));

const detail = read(
  "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
);
assert.ok(detail.includes("대진 현황"));
assert.ok(!detail.includes("결과 및 대진"));
assert.ok(detail.includes("FieldStatusBracketMatchCards"));
assert.ok(!detail.includes("FighterMyMatchQrPanel"));
assert.ok(!detail.includes("getFighterMyMatchPublicUrlAction"));
assert.ok(!detail.includes("QR URL"));
assert.ok(detail.includes("OrganizerBracketViewMatchCard") === false);
assert.ok(detail.includes('title="메모"'));
assert.ok(detail.includes("6. 관리"));
assert.ok(detail.includes("FieldMemoForm"));
assert.ok(!detail.includes("FieldMemoForm row={row} />") || detail.includes("FieldMemoForm row={row}"));

const matchCards = read(
  "src/components/domain/field-status/FieldStatusBracketMatchCards.tsx",
);
assert.ok(matchCards.includes("OrganizerBracketViewMatchCard"));
assert.ok(matchCards.includes("highlightFighterId"));
assert.ok(matchCards.includes("아직 배정된 대진이 없습니다"));
assert.ok(matchCards.includes("경기 운영에서 보기"));

const viewCard = read(
  "src/components/domain/brackets/OrganizerBracketViewMatchCard.tsx",
);
assert.ok(viewCard.includes("highlightFighterId"));
assert.ok(viewCard.includes("현재 선수"));

const bracketVm = read("src/lib/field-status-bracket.ts");
assert.ok(bracketVm.includes("fighterRedId"));
assert.ok(bracketVm.includes("fighterBlueId"));
assert.ok(bracketVm.includes("parseBracketFighterSnapshot"));

const validator = read("src/lib/validators/field-status.validator.ts");
assert.ok(validator.includes(".max(500)"));

const memoForm = read(
  "src/components/domain/field-status/FieldStatusApplicationActions.tsx",
);
assert.ok(memoForm.includes("maxLength={500}"));
assert.ok(memoForm.includes("참가자에 대한 운영 메모"));
assert.ok(memoForm.includes("fieldMemo"));

const schema = read("prisma/schema.prisma");
assert.ok(schema.includes("fieldMemo"));

console.log("verify:onsite-weighin-detail OK");
