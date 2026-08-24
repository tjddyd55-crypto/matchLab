/**
 * verify:athlete-record-structured
 * 구조화 전적/학년 파싱의 핵심 케이스를 검증한다.
 */
import assert from "node:assert/strict";
import {
  parseRecordText,
  validateRecord,
  buildRecordText,
  parseGrade,
  getElementaryMatchBand,
  SCHOOL_LEVEL,
} from "../src/lib/fighter/record";

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}: ${String(e)}`);
    failed++;
  }
}

console.log("\n[전적 파싱]");
check("무전", () => {
  const r = parseRecordText("무전");
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 0);
  assert.equal(r.record.wins, null);
  assert.equal(r.recordText, "무전");
});
check("총전만 9전", () => {
  const r = parseRecordText("9전");
  assert.ok(r.ok);
  assert.deepEqual(r.record, {
    totalBouts: 9,
    wins: null,
    draws: null,
    losses: null,
  });
  assert.equal(r.recordText, "9전");
});
check("7전 7승", () => {
  const r = parseRecordText("7전7승");
  assert.ok(r.ok);
  assert.equal(r.record.totalBouts, 7);
  assert.equal(r.record.wins, 7);
  assert.equal(r.record.losses, 0);
});
check("3전 1승 1무 1패", () => {
  const r = parseRecordText("3전 1승 1무 1패");
  assert.ok(r.ok);
  assert.deepEqual(r.record, { totalBouts: 3, wins: 1, draws: 1, losses: 1 });
});
check("애매한 전적 파싱 실패", () => {
  assert.ok(!parseRecordText("2경기 가능(무전)").ok);
  assert.ok(!parseRecordText("전적 3승 3패(MMA) / ...").ok);
  assert.ok(!parseRecordText("9전7승2패 중(...)").ok);
});
check("합계 불일치", () => {
  const r = parseRecordText("3전 2승 2패");
  assert.ok(!r.ok);
});

console.log("\n[전적 검증]");
check("정상 검증 통과", () => {
  assert.ok(validateRecord({ totalBouts: 0, wins: null, draws: null, losses: null }).ok);
  assert.ok(validateRecord({ totalBouts: 3, wins: 2, draws: 0, losses: 1 }).ok);
  assert.ok(validateRecord({ totalBouts: 9, wins: null, draws: null, losses: null }).ok);
});
check("합계 불일치 차단", () => {
  assert.ok(!validateRecord({ totalBouts: 3, wins: 2, draws: 0, losses: 2 }).ok);
  assert.ok(!validateRecord({ totalBouts: 9, wins: 0, draws: 0, losses: 0 }).ok);
});
check("부분 입력 차단", () => {
  assert.ok(!validateRecord({ totalBouts: 9, wins: 5, draws: null, losses: null }).ok);
});
check("음수 차단", () => {
  assert.ok(!validateRecord({ totalBouts: -1, wins: 0, draws: 0, losses: -1 }).ok);
});

console.log("\n[recordText 생성]");
check("무전 생성", () => {
  assert.equal(buildRecordText({ totalBouts: 0, wins: null, draws: null, losses: null }), "무전");
});
check("총전만", () => {
  assert.equal(buildRecordText({ totalBouts: 9, wins: null, draws: null, losses: null }), "9전");
});
check("0무 생략", () => {
  assert.equal(buildRecordText({ totalBouts: 3, wins: 2, draws: 0, losses: 1 }), "3전 2승 1패");
});
check("무 포함", () => {
  assert.equal(buildRecordText({ totalBouts: 3, wins: 1, draws: 1, losses: 1 }), "3전 1승 1무 1패");
});

console.log("\n[학년 파싱]");
check("초1~6 파싱", () => {
  for (let g = 1; g <= 6; g++) {
    const r = parseGrade(`초${g}`);
    assert.ok(r.ok, `초${g} 파싱 실패`);
    assert.equal(r.grade.schoolLevel, SCHOOL_LEVEL.ELEMENTARY);
    assert.equal(r.grade.schoolGrade, g);
  }
});
check("중1~3 파싱", () => {
  for (let g = 1; g <= 3; g++) {
    const r = parseGrade(`중${g}`);
    assert.ok(r.ok);
    assert.equal(r.grade.schoolLevel, SCHOOL_LEVEL.MIDDLE);
  }
});
check("고1~3 파싱", () => {
  for (let g = 1; g <= 3; g++) {
    const r = parseGrade(`고${g}`);
    assert.ok(r.ok);
    assert.equal(r.grade.schoolLevel, SCHOOL_LEVEL.HIGH);
  }
});
check("성인 파싱", () => {
  const r = parseGrade("성인");
  assert.ok(r.ok);
  assert.equal(r.grade.schoolLevel, SCHOOL_LEVEL.ADULT);
  assert.equal(r.grade.schoolGrade, null);
});
check("초7 파싱 실패", () => {
  assert.ok(!parseGrade("초7").ok);
});

console.log("\n[초등부 band]");
check("초1~3 → LOW", () => {
  assert.equal(getElementaryMatchBand(1), "LOW");
  assert.equal(getElementaryMatchBand(2), "LOW");
  assert.equal(getElementaryMatchBand(3), "LOW");
});
check("초4~6 → HIGH", () => {
  assert.equal(getElementaryMatchBand(4), "HIGH");
  assert.equal(getElementaryMatchBand(5), "HIGH");
  assert.equal(getElementaryMatchBand(6), "HIGH");
});

console.log(`\n결과: ${passed}개 통과, ${failed}개 실패\n`);
if (failed > 0) process.exit(1);
