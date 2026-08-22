/**
 * 자동매칭 — 동일 EventDivision 내 체중 근접 우선 (max cardinality 유지)
 *
 *   npm run verify:auto-match-weight-priority
 */
import assert from "node:assert/strict";
import { pairWithRecordAndGrade } from "../src/lib/brackets/record-auto-match";
import type { RecordMatchCandidate } from "../src/lib/brackets/record-auto-match";

function cand(input: {
  id: string;
  kg: number | null;
  gymId?: string;
  totalBouts?: number | null;
}): RecordMatchCandidate {
  return {
    applicationId: input.id,
    fighterId: `f-${input.id}`,
    divisionId: "div1",
    gymId: input.gymId ?? `gym-${input.id}`,
    gymName: `체육관${input.gymId ?? input.id}`,
    fighterName: `선수${input.id}`,
    appliedAt: new Date("2026-01-01"),
    isEligibleForBracket: true,
    isAssignableForBracket: true,
    totalBouts: input.totalBouts ?? 2,
    schoolLevel: null,
    schoolGrade: null,
    applicationWeightKg: input.kg,
  };
}

function pairKeys(result: ReturnType<typeof pairWithRecordAndGrade>) {
  return result.pairs
    .map((p) =>
      [p.red.applicationId, p.blue.applicationId].sort().join("-"),
    )
    .sort();
}

function totalWeightDiff(result: ReturnType<typeof pairWithRecordAndGrade>) {
  return result.pairs.reduce((sum, p) => sum + (p.weightDiffKg ?? 0), 0);
}

console.log("\n[체중 근접 자동매칭]");

{
  // A: 4명 자유 매칭 → 가까운 쌍
  const r = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 61.2 }),
      cand({ id: "B", kg: 62.0 }),
      cand({ id: "C", kg: 65.5 }),
      cand({ id: "D", kg: 66.1 }),
    ],
    { forbidSameGym: true },
  );
  assert.equal(r.pairs.length, 2, "A: 2경기");
  assert.deepEqual(pairKeys(r), ["A-B", "C-D"]);
  assert.ok(Math.abs(totalWeightDiff(r) - (0.8 + 0.6)) < 1e-6);
  console.log("  ✓ A 4명 → 61.2↔62.0, 65.5↔66.1");
}

{
  // B: 가장 가까운 A-B 동일 체육관 → 제외 후 최적
  const r = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 60.0, gymId: "X" }),
      cand({ id: "B", kg: 60.5, gymId: "X" }),
      cand({ id: "C", kg: 62.0, gymId: "Y" }),
      cand({ id: "D", kg: 63.0, gymId: "Z" }),
    ],
    { forbidSameGym: true },
  );
  assert.equal(r.pairs.length, 2, "B: cardinality 2 유지");
  const keys = pairKeys(r);
  assert.ok(!keys.includes("A-B"), "B: 동일체육관 최근접 제외");
  assert.equal(keys.length, 2);
  console.log("  ✓ B 동일체육관 제약 + cardinality 유지");
}

{
  // C: 전적 hard — 체중 가까워도 |diff|>=2 금지
  const r = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 60.0, totalBouts: 1 }),
      cand({ id: "B", kg: 60.2, totalBouts: 4 }),
      cand({ id: "C", kg: 70.0, totalBouts: 1 }),
      cand({ id: "D", kg: 71.0, totalBouts: 4 }),
    ],
    { forbidSameGym: true },
  );
  // same-bout pairs: A-C (1전), B-D (4전) — 체중이 멀어도 전적 동일 우선 풀
  assert.equal(r.pairs.length, 2);
  assert.deepEqual(pairKeys(r), ["A-C", "B-D"]);
  console.log("  ✓ C 전적 hard constraint 유지");
}

{
  // D: 홀수 3명 → 가장 가까운 유효 pair
  const r = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 60 }),
      cand({ id: "B", kg: 61 }),
      cand({ id: "C", kg: 65 }),
    ],
    { forbidSameGym: true },
  );
  assert.equal(r.pairs.length, 1);
  assert.deepEqual(pairKeys(r), ["A-B"]);
  assert.equal(r.unmatched.map((u) => u.applicationId).sort().join(), "C");
  console.log("  ✓ D 홀수 → A↔B, C 미매칭");
}

{
  // E: 체중 우선이 Match 수를 줄이면 안 됨
  // A-B 가까움, C-D 가까움, 교차하면 체중합이 더 크지만 경기 수는 동일
  // 5명: 최대 2경기 유지
  const r = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 55 }),
      cand({ id: "B", kg: 56 }),
      cand({ id: "C", kg: 60 }),
      cand({ id: "D", kg: 61 }),
      cand({ id: "E", kg: 70 }),
    ],
    { forbidSameGym: true },
  );
  assert.equal(r.pairs.length, 2, "E: max cardinality 2");
  assert.deepEqual(pairKeys(r), ["A-B", "C-D"]);
  assert.equal(r.unmatched.map((u) => u.applicationId).join(), "E");
  console.log("  ✓ E max-cardinality 유지 + 체중 최소");
}

{
  // F: n>16 blossom — crash/timeout 없이 maximum cardinality
  const many: ReturnType<typeof cand>[] = [];
  for (let i = 0; i < 18; i++) {
    many.push(
      cand({
        id: `N${String(i).padStart(2, "0")}`,
        kg: 55 + i * 0.4,
        gymId: `g${i % 9}`,
        totalBouts: 2,
      }),
    );
  }
  const started = Date.now();
  const r = pairWithRecordAndGrade(many, { forbidSameGym: true });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 5_000, `F: timeout ${elapsed}ms`);
  assert.equal(r.pairs.length, 9, "F: 18명 → 최대 9경기");
  assert.equal(r.unmatched.length, 0);
  // hard: 동일 체육관 pair 없어야 함
  for (const p of r.pairs) {
    assert.equal(p.sameGymWarning, false);
  }
  // deterministic re-run
  const r2 = pairWithRecordAndGrade(many, { forbidSameGym: true });
  assert.deepEqual(pairKeys(r), pairKeys(r2));
  console.log(`  ✓ F n=18 blossom (${elapsed}ms, 9 pairs, deterministic)`);
}

{
  // 교차 pairing이 체중합이 더 크면 선택되지 않음
  const badStyle = pairWithRecordAndGrade(
    [
      cand({ id: "A", kg: 61.2 }),
      cand({ id: "B", kg: 62.0 }),
      cand({ id: "C", kg: 65.5 }),
      cand({ id: "D", kg: 66.1 }),
    ],
    { forbidSameGym: true },
  );
  assert.ok(!pairKeys(badStyle).includes("A-D"));
  assert.ok(!pairKeys(badStyle).includes("B-C"));
  console.log("  ✓ 교차(A-D/B-C) 비선택");
}

console.log("\nPASS verify-auto-match-weight-priority\n");
