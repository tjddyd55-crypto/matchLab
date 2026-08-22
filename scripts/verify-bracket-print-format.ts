/**
 * 시합 대진표 출력 — 순수 포맷터 fixture
 *
 *   npx tsx scripts/verify-bracket-print-format.ts
 */
import assert from "node:assert/strict";
import {
  buildBracketPrintDocumentTitle,
  buildBracketPrintFighterDto,
  buildBracketPrintFighterIdentityLine,
  formatApplicationWeightLabel,
  formatBracketPrintEventDate,
} from "../src/lib/brackets/bracket-print-format";
import { formatSchoolGradeCompactLabel } from "../src/lib/fighter/record";
import { formatMatchOrderShort } from "../src/lib/match-order-display";

console.log("\n[시합 대진표 출력 포맷]");

assert.equal(formatApplicationWeightLabel(58), "58kg");
assert.equal(formatApplicationWeightLabel(65.5), "65.5kg");
assert.equal(formatApplicationWeightLabel(null), null);
console.log("  ✓ 체중 라벨");

assert.equal(
  formatSchoolGradeCompactLabel({ schoolLevel: "ELEMENTARY", schoolGrade: 5 }),
  "초5",
);
assert.equal(
  formatSchoolGradeCompactLabel({ schoolLevel: "MIDDLE", schoolGrade: 3 }),
  "중3",
);
assert.equal(
  formatSchoolGradeCompactLabel({ schoolLevel: "HIGH", schoolGrade: 2 }),
  "고2",
);
assert.equal(
  formatSchoolGradeCompactLabel({ schoolLevel: "ADULT", schoolGrade: null }),
  "성인",
);
console.log("  ✓ 학년/성인 라벨");

{
  const f = buildBracketPrintFighterDto({
    name: "김무현",
    gymNameSnapshot: "산본더원",
    gymSnapshot: null,
    gymRelationName: null,
    fighterSnapshot: { applicationWeightKg: 58 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 3,
    totalBoutsSnapshot: 2,
    winsSnapshot: 1,
    drawsSnapshot: 0,
    lossesSnapshot: 1,
    recordText: null,
  });
  assert.equal(f.identityLine, "김무현 / 산본더원 / 58kg / 중3");
  assert.equal(f.recordLabel, "2전 1승 1패");
  console.log("  ✓ 선수 identity + 전적");
}

{
  const f = buildBracketPrintFighterDto({
    name: "무전선수",
    gymNameSnapshot: "팀윈드",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 70 },
    schoolLevelSnapshot: "ADULT",
    schoolGradeSnapshot: null,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
  });
  assert.equal(f.recordLabel, "무전");
  assert.ok(f.identityLine.includes("성인"));
  console.log("  ✓ 무전 / 성인");
}

{
  const f = buildBracketPrintFighterDto({
    name: "긴체육관",
    gymNameSnapshot: "다물원 킥복싱 MMA 태권도장",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 85 },
    schoolLevelSnapshot: "HIGH",
    schoolGradeSnapshot: 2,
    totalBoutsSnapshot: 10,
    winsSnapshot: 6,
    drawsSnapshot: 1,
    lossesSnapshot: 3,
  });
  assert.ok(f.gymName.includes("다물원"));
  assert.equal(f.recordLabel, "10전 6승 1무 3패");
  console.log("  ✓ 긴 체육관명 / 긴 전적");
}

assert.equal(
  formatMatchOrderShort({
    matchNumber: 8,
    globalMatchOrder: 0,
    matchOrder: 0,
  }),
  "8경기",
);
assert.equal(
  buildBracketPrintDocumentTitle("제12회 마포구청장배"),
  "MATCHON_제12회 마포구청장배_시합대진표",
);
assert.equal(
  formatBracketPrintEventDate(new Date("2026-08-22T00:00:00+09:00")),
  "2026-08-22",
);
assert.equal(
  buildBracketPrintFighterIdentityLine({
    name: "A",
    gymName: "B",
    weightLabel: null,
    gradeLabel: "중1",
  }),
  "A / B / 중1",
);
console.log("  ✓ 경기번호 / 문서 제목 / 날짜");

console.log("\nPASS verify-bracket-print-format\n");
