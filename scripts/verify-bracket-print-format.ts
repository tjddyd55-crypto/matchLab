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
  buildBracketPrintPages,
  buildUnmatchedPrintDocumentTitle,
  buildUnmatchedPrintPages,
  formatApplicationWeightLabel,
  formatBracketPrintEventDate,
  formatBracketPrintRecordDisplay,
  formatPrintGenderShort,
} from "../src/lib/brackets/bracket-print-format";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "../src/lib/court-match-order";
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
  assert.equal(f.name, "김무현");
  assert.equal(f.gymName, "산본더원");
  assert.equal(f.weightLabel, "58kg");
  assert.equal(f.gradeLabel, "중3");
  assert.equal(f.recordLabel, "2전 1승 1패");
  assert.equal(f.recordDisplayLabel, "현재 2전 1승 1패");
  // 4열 UI는 컴포넌트에서 3줄 조합: 이름 / 체육관·경기구분·체중 / 전적
  assert.ok(f.identityLine.includes("김무현"));
  console.log("  ✓ 선수 필드 + 전적");
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
  assert.equal(f.recordDisplayLabel, "현재 무전");
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

{
  const courts = [
    { id: "c1", sortOrder: 0 },
    { id: "c2", sortOrder: 1 },
  ];
  const ordered = sortMatchesByCourtSchedule(
    [
      {
        matchId: "m-b",
        courtId: "c1",
        courtOrder: 2,
        matchNumber: 99,
        globalMatchOrder: 0,
        matchOrder: 0,
      },
      {
        matchId: "m-a",
        courtId: "c1",
        courtOrder: 1,
        matchNumber: 1,
        globalMatchOrder: 0,
        matchOrder: 0,
      },
    ],
    courts,
  );
  assert.deepEqual(
    ordered.map((m) => m.matchId),
    ["m-a", "m-b"],
  );
  assert.equal(
    formatCourtScheduleMatchOrderShort({
      courtId: "c1",
      courtOrder: 3,
      matchNumber: 99,
      globalMatchOrder: 0,
      matchOrder: 0,
    }),
    "99경기",
  );
  console.log("  ✓ court schedule sort + matchNumber label");
}
assert.equal(
  buildBracketPrintDocumentTitle("제12회 마포구청장배"),
  "MATCHON_제12회마포구청장배_대진표",
);
assert.equal(
  buildUnmatchedPrintDocumentTitle("제12회 마포구청장배"),
  "MATCHON_제12회마포구청장배_미매칭선수",
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

assert.equal(formatPrintGenderShort("male"), "남");
assert.equal(formatPrintGenderShort("female"), "여");
assert.equal(formatBracketPrintRecordDisplay("무전"), "현재 무전");

{
  const pages = buildBracketPrintPages(
    Array.from({ length: 19 }, (_, i) => ({
      matchId: `m${i}`,
      matchNoLabel: `${i + 1}경기`,
      divisionLabel: null,
      arenaName: null,
      red: null,
      blue: null,
    })),
  );
  assert.equal(pages.length, 2);
  assert.equal(pages[0]!.matches.length, 10);
  assert.equal(pages[0]!.matchRangeLabel, "1~10경기");
  assert.equal(pages[1]!.matchRangeLabel, "11~19경기");
  assert.equal(pages[1]!.pageIndex, 2);
  assert.equal(pages[1]!.pageCount, 2);
  console.log("  ✓ 대진표 page chunk");
}

{
  const pages = buildUnmatchedPrintPages(
    Array.from({ length: 19 }, (_, i) => ({
      index: i + 1,
      gymName: "G",
      fighterName: "F",
      genderLabel: "남",
      divisionLabel: "초3",
      recordLabel: "무전",
      weightLabel: "35kg",
    })),
  );
  assert.equal(pages.length, 1);
  assert.equal(pages[0]!.rows.length, 19);
  assert.match(pages[0]!.rangeLabel, /총 19명/);
  console.log("  ✓ 미매칭 page chunk (20/page)");
}

console.log("\nPASS verify-bracket-print-format\n");
