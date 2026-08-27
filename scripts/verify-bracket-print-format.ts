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
  formatCourtPrintFighterMeta,
  formatDetailedPrintFighterMeta,
  formatPrintGenderShort,
  resolveBracketPrintFighterMetaLine,
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
assert.equal(formatPrintGenderShort("남성"), "남");
assert.equal(formatBracketPrintRecordDisplay("무전"), "현재 무전");

{
  const male = buildBracketPrintFighterDto({
    name: "강로원",
    gymNameSnapshot: "T-MAC 종합격투기",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 66 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 2,
    totalBoutsSnapshot: 2,
    winsSnapshot: 2,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  assert.equal(
    formatDetailedPrintFighterMeta(male, { ageGroupLabel: "중등부" }),
    "남 · 중등부 · 중2 · 66kg · 2전 2승 0패",
  );
  assert.equal(formatCourtPrintFighterMeta(male), "남 · 2전 2승 0패");
  assert.equal(
    resolveBracketPrintFighterMetaLine({
      fighter: male,
      mode: "all-matches",
      ageGroupLabel: "중등부",
    }),
    "남 · 중등부 · 중2 · 66kg · 2전 2승 0패",
  );
  assert.equal(
    resolveBracketPrintFighterMetaLine({ fighter: male, mode: "court" }),
    "남 · 2전 2승 0패",
  );
  console.log("  ✓ detailed / court meta (남)");
}

{
  const female = buildBracketPrintFighterDto({
    name: "이수아",
    gymNameSnapshot: "산본더원",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 41 },
    schoolLevelSnapshot: "ELEMENTARY",
    schoolGradeSnapshot: 3,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "여성",
  });
  assert.equal(
    formatDetailedPrintFighterMeta(female, { ageGroupLabel: "초등부" }),
    "여 · 초등부 · 초3 · 41kg · 무전",
  );
  assert.equal(formatCourtPrintFighterMeta(female), "여 · 무전");
  const courtLine = formatCourtPrintFighterMeta(female) ?? "";
  assert.doesNotMatch(courtLine, /초등부|초3|41kg/);
  console.log("  ✓ detailed / court meta (여) + court omits division/grade/weight");
}

{
  const partial = buildBracketPrintFighterDto({
    name: "부분정보",
    gymNameSnapshot: "짐",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 66 },
    schoolLevelSnapshot: null,
    schoolGradeSnapshot: null,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  assert.equal(
    formatDetailedPrintFighterMeta(partial, { ageGroupLabel: "중등부" }),
    "남 · 중등부 · 66kg · 무전",
  );
  assert.doesNotMatch(
    formatDetailedPrintFighterMeta(partial, { ageGroupLabel: "중등부" }) ?? "",
    /·\s*·|-\s*·/,
  );
  console.log("  ✓ null-safe meta join");
}

{
  const appWeight = buildBracketPrintFighterDto({
    name: "체중구분",
    gymNameSnapshot: "짐",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 66 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 2,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  assert.equal(appWeight.weightLabel, "66kg");
  assert.ok(
    (formatDetailedPrintFighterMeta(appWeight, { ageGroupLabel: "중등부" }) ??
      ""
    ).includes("66kg"),
  );
  console.log("  ✓ application weight source (not matchWeightKg)");
}

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
  assert.equal(pages.length, 3);
  assert.equal(pages[0]!.matches.length, 8);
  assert.equal(pages[0]!.matchRangeLabel, "1~8경기");
  assert.equal(pages[2]!.matchRangeLabel, "17~19경기");
  assert.equal(pages[1]!.pageIndex, 2);
  assert.equal(pages[1]!.pageCount, 3);
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
