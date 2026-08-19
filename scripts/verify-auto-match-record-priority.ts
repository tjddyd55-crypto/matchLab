/**
 * verify:auto-match-record-priority
 * PART 17 fixture 검증 + 전적 알고리즘 단위 테스트
 */
import assert from "node:assert/strict";
import { pairWithRecordAndGrade } from "../src/lib/brackets/record-auto-match";
import type { RecordMatchCandidate } from "../src/lib/brackets/record-auto-match";
import {
  parseRecordText,
  validateRecord,
  buildRecordText,
  parseGrade,
  getElementaryMatchBand,
} from "../src/lib/fighter/record";

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${String(e)}`);
    failed++;
  }
}

function makeCandidate(
  id: string,
  totalBouts: number | null,
  gymId = "gym1",
  schoolLevel: string | null = null,
  schoolGrade: number | null = null,
): RecordMatchCandidate {
  return {
    applicationId: id,
    fighterId: `fighter-${id}`,
    divisionId: "div1",
    gymId,
    gymName: `체육관${gymId}`,
    fighterName: `선수${id}`,
    appliedAt: new Date("2026-01-01"),
    isEligibleForBracket: true,
    isAssignableForBracket: true,
    totalBouts,
    schoolLevel,
    schoolGrade,
  };
}

function pairs(result: ReturnType<typeof pairWithRecordAndGrade>) {
  return result.pairs.map((p) => [p.red.applicationId, p.blue.applicationId].sort());
}

function unmatched(result: ReturnType<typeof pairWithRecordAndGrade>) {
  return result.unmatched.map((u) => u.applicationId).sort();
}

// ──────────────────────────────────────────
// Part A: 전적 구조화 유틸
// ──────────────────────────────────────────
console.log("\n[전적 파싱 / 검증 / 텍스트 생성]");

check("무전 → 0/0/0/0", () => {
  const r = parseRecordText("무전");
  assert.ok(r.ok);
  assert.deepEqual(r.record, { totalBouts: 0, wins: 0, draws: 0, losses: 0 });
  assert.equal(r.recordText, "무전");
});

check(":무전 → 무전", () => {
  const r = parseRecordText(":무전");
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 0);
});

check("null → 무전", () => {
  const r = parseRecordText(null);
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 0);
});

check("3전 2승 1패 파싱", () => {
  const r = parseRecordText("3전 2승 1패");
  assert.ok(r.ok);
  assert.deepEqual(r.record, { totalBouts: 3, wins: 2, draws: 0, losses: 1 });
  assert.equal(r.recordText, "3전 2승 1패");
});

check("3전2승1패 (공백없이) 파싱", () => {
  const r = parseRecordText("3전2승1패");
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 3);
});

check("10전 6승 1무 3패 파싱", () => {
  const r = parseRecordText("10전 6승 1무 3패");
  assert.ok(r.ok);
  assert.deepEqual(r.record, { totalBouts: 10, wins: 6, draws: 1, losses: 3 });
});

check("2승 1패 (총전 없는 형태) 파싱", () => {
  const r = parseRecordText("2승 1패");
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 3);
});

check("합계 불일치 → ok false", () => {
  const r = parseRecordText("3전 2승 2패");
  assert.ok(!r.ok);
});

check("애매한 전적 → ok false", () => {
  const r = parseRecordText("2경기 가능(무전)");
  assert.ok(!r.ok);
});

check("validateRecord 정상", () => {
  const v = validateRecord({ totalBouts: 3, wins: 2, draws: 0, losses: 1 });
  assert.ok(v.ok);
});

check("validateRecord 합계 불일치", () => {
  const v = validateRecord({ totalBouts: 3, wins: 2, draws: 0, losses: 2 });
  assert.ok(!v.ok);
});

check("buildRecordText 무전", () => {
  assert.equal(buildRecordText({ totalBouts: 0, wins: 0, draws: 0, losses: 0 }), "무전");
});

check("buildRecordText 3전 2승 1패 (0무 생략)", () => {
  assert.equal(buildRecordText({ totalBouts: 3, wins: 2, draws: 0, losses: 1 }), "3전 2승 1패");
});

check("buildRecordText 3전 1승 1무 1패", () => {
  assert.equal(buildRecordText({ totalBouts: 3, wins: 1, draws: 1, losses: 1 }), "3전 1승 1무 1패");
});

// ──────────────────────────────────────────
// Part B: 학년 파싱
// ──────────────────────────────────────────
console.log("\n[학년 파싱]");

check("초3 → ELEMENTARY 3", () => {
  const r = parseGrade("초3");
  assert.ok(r.ok);
  assert.equal(r.grade.schoolLevel, "ELEMENTARY");
  assert.equal(r.grade.schoolGrade, 3);
});

check("중2 → MIDDLE 2", () => {
  const r = parseGrade("중2");
  assert.ok(r.ok);
  assert.equal(r.grade.schoolLevel, "MIDDLE");
  assert.equal(r.grade.schoolGrade, 2);
});

check("성인 → ADULT null", () => {
  const r = parseGrade("성인");
  assert.ok(r.ok);
  assert.equal(r.grade.schoolLevel, "ADULT");
  assert.equal(r.grade.schoolGrade, null);
});

check("초7 → 파싱 실패", () => {
  const r = parseGrade("초7");
  assert.ok(!r.ok);
});

check("초3 band = LOW", () => {
  assert.equal(getElementaryMatchBand(3), "LOW");
});

check("초4 band = HIGH", () => {
  assert.equal(getElementaryMatchBand(4), "HIGH");
});

// ──────────────────────────────────────────
// Part C: 자동매칭 Fixture (PART 17)
// ──────────────────────────────────────────
console.log("\n[자동매칭 Fixture]");

check("#72 [0,0] → 1 pair", () => {
  const c = [makeCandidate("A", 0, "g1"), makeCandidate("B", 0, "g2")];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  assert.equal(r.unmatched.length, 0);
});

check("#73 [0,1] → 0 pairs, 2 unmatched", () => {
  const c = [makeCandidate("A", 0, "g1"), makeCandidate("B", 1, "g2")];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 0);
  assert.equal(r.unmatched.length, 2);
});

check("#74 [1,2,3] → 1↔2, 3 unresolved", () => {
  const c = [
    makeCandidate("A", 1, "g1"),
    makeCandidate("B", 2, "g2"),
    makeCandidate("C", 3, "g3"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  const p = pairs(r)[0]!;
  assert.ok(p.includes("A") && p.includes("B"), `expected A↔B got ${JSON.stringify(p)}`);
  assert.ok(unmatched(r).includes("C"));
});

check("#75 [1,1,2] → 1↔1, 2 unresolved", () => {
  const c = [
    makeCandidate("A", 1, "g1"),
    makeCandidate("B", 1, "g2"),
    makeCandidate("C", 2, "g3"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  const p = pairs(r)[0]!;
  assert.ok(p.includes("A") && p.includes("B"), `expected A↔B got ${JSON.stringify(p)}`);
  assert.ok(unmatched(r).includes("C"), `expected C unresolved, got ${JSON.stringify(unmatched(r))}`);
});

check("#76 [1,2,2,3] → 2↔2, 1,3 unresolved", () => {
  const c = [
    makeCandidate("A", 1, "g1"),
    makeCandidate("B", 2, "g2"),
    makeCandidate("C", 2, "g3"),
    makeCandidate("D", 3, "g4"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  const p = pairs(r)[0]!;
  assert.ok(p.includes("B") && p.includes("C"), `expected B↔C got ${JSON.stringify(p)}`);
  const u = unmatched(r);
  assert.ok(u.includes("A") && u.includes("D"), `expected A,D unresolved got ${JSON.stringify(u)}`);
});

check("#77 [1,2,3,4] → 1↔2, 3↔4", () => {
  const c = [
    makeCandidate("A", 1, "g1"),
    makeCandidate("B", 2, "g2"),
    makeCandidate("C", 3, "g3"),
    makeCandidate("D", 4, "g4"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 2);
  assert.equal(r.unmatched.length, 0);
});

check("#78 [2,2,3,3] → 2↔2, 3↔3", () => {
  const c = [
    makeCandidate("A", 2, "g1"),
    makeCandidate("B", 2, "g2"),
    makeCandidate("C", 3, "g3"),
    makeCandidate("D", 3, "g4"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 2);
  assert.equal(r.unmatched.length, 0);
});

check("#79 [1,3] → both unresolved", () => {
  const c = [makeCandidate("A", 1, "g1"), makeCandidate("B", 3, "g2")];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 0);
  assert.equal(r.unmatched.length, 2);
});

check("#81 초3↔초4 자동매칭 금지", () => {
  const c = [
    makeCandidate("A", 1, "g1", "ELEMENTARY", 3),
    makeCandidate("B", 1, "g2", "ELEMENTARY", 4),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 0);
  assert.equal(r.unmatched.length, 2);
});

check("#82 초1↔초5 자동매칭 금지", () => {
  const c = [
    makeCandidate("A", 1, "g1", "ELEMENTARY", 1),
    makeCandidate("B", 1, "g2", "ELEMENTARY", 5),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 0);
  assert.equal(r.unmatched.length, 2);
});

check("#80 초등 LOW [초1,초2,초3] 전적 조건 매칭", () => {
  const c = [
    makeCandidate("A", 1, "g1", "ELEMENTARY", 1),
    makeCandidate("B", 1, "g2", "ELEMENTARY", 2),
    makeCandidate("C", 2, "g3", "ELEMENTARY", 3),
  ];
  const r = pairWithRecordAndGrade(c);
  // A↔B (same bouts), C unresolved
  assert.equal(r.pairs.length, 1);
  const p = pairs(r)[0]!;
  assert.ok(p.includes("A") && p.includes("B"), `expected A↔B got ${JSON.stringify(p)}`);
});

check("#83 초등 HIGH [초4,초5,초6] 매칭 가능", () => {
  const c = [
    makeCandidate("A", 1, "g1", "ELEMENTARY", 4),
    makeCandidate("B", 1, "g2", "ELEMENTARY", 5),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
});

check("#84 same grade preference: 초4A↔초4B vs 초6C", () => {
  const c = [
    makeCandidate("A", 1, "g1", "ELEMENTARY", 4),
    makeCandidate("B", 1, "g2", "ELEMENTARY", 4),
    makeCandidate("C", 1, "g3", "ELEMENTARY", 6),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  const p = pairs(r)[0]!;
  assert.ok(p.includes("A") && p.includes("B"), `expected A↔B (same grade) got ${JSON.stringify(p)}`);
  assert.ok(unmatched(r).includes("C"));
});

check("#48 [3,3,3] → 1 pair, 1 unresolved", () => {
  const c = [
    makeCandidate("A", 3, "g1"),
    makeCandidate("B", 3, "g2"),
    makeCandidate("C", 3, "g3"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
  assert.equal(r.unmatched.length, 1);
});

check("#46 [0,0,1,2,3] → 0↔0, 1↔2, 3 unresolved", () => {
  const c = [
    makeCandidate("A", 0, "g1"),
    makeCandidate("B", 0, "g2"),
    makeCandidate("C", 1, "g3"),
    makeCandidate("D", 2, "g4"),
    makeCandidate("E", 3, "g5"),
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 2);
  assert.equal(r.unmatched.length, 1);
  assert.ok(unmatched(r).includes("E"));
});

check("계체 전(isEligible=false)도 신청자 기준 페어", () => {
  const c = [
    { ...makeCandidate("A", 0, "g1"), isEligibleForBracket: false },
    { ...makeCandidate("B", 0, "g2"), isEligibleForBracket: false },
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
});

check("같은 gymId라도 표시 체육관명이 다르면 페어 허용", () => {
  const c = [
    { ...makeCandidate("A", 0, "shared"), gymName: "QA짐G" },
    { ...makeCandidate("B", 0, "shared"), gymName: "QA짐H" },
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 1);
});

check("표시 체육관명이 같으면 gymId가 달라도 같은 체육관", () => {
  const c = [
    { ...makeCandidate("A", 0, "g1"), gymName: "QA짐SAME" },
    { ...makeCandidate("B", 0, "g2"), gymName: "QA짐SAME" },
  ];
  const r = pairWithRecordAndGrade(c);
  assert.equal(r.pairs.length, 0);
  assert.equal(r.unmatched.length, 2);
});

// ──────────────────────────────────────────
// Summary
// ──────────────────────────────────────────
console.log(`\n결과: ${passed}개 통과, ${failed}개 실패\n`);
if (failed > 0) process.exit(1);
