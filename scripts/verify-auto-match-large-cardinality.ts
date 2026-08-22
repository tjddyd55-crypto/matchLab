/**
 * n>16 large-group: maximum cardinality matching (Edmonds) + soft priorities
 *
 *   npm run verify:auto-match-large-cardinality
 */
import assert from "node:assert/strict";
import { maxWeightMatching } from "../src/lib/brackets/max-weight-matching";
import {
  findCompatibleUnmatchedPair,
  pairWithRecordAndGrade,
  type RecordMatchCandidate,
} from "../src/lib/brackets/record-auto-match";
import { explainRecordUnmatched } from "../src/lib/brackets/explain-record-unmatched";

function cand(input: {
  id: string;
  kg: number | null;
  gymId?: string;
  totalBouts?: number | null;
  appliedAt?: string;
}): RecordMatchCandidate {
  return {
    applicationId: input.id,
    fighterId: `f-${input.id}`,
    divisionId: "div1",
    gymId: input.gymId ?? `gym-${input.id}`,
    gymName: `체육관${input.gymId ?? input.id}`,
    fighterName: `선수${input.id}`,
    appliedAt: new Date(input.appliedAt ?? "2026-01-01"),
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

function naiveFirstFitCardinality(pool: RecordMatchCandidate[]): number {
  const working = [...pool].sort((a, b) =>
    a.applicationId.localeCompare(b.applicationId),
  );
  let count = 0;
  while (working.length >= 2) {
    const first = working.shift()!;
    const idx = working.findIndex(
      (c) =>
        c.gymId !== first.gymId &&
        (first.totalBouts ?? 0) === (c.totalBouts ?? 0),
    );
    if (idx < 0) continue;
    working.splice(idx, 1);
    count += 1;
  }
  return count;
}

console.log("\n[large-cardinality / blossom]");

{
  // Greedy-fail graph: first-fit = 2, maximum = 3
  // edges: 0-1,0-2,0-3,1-4,2-5 (all weight 1), maxCardinality
  const edges: Array<[number, number, number]> = [
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 1],
    [1, 4, 1],
    [2, 5, 1],
  ];
  const mate = maxWeightMatching(edges, true);
  let pairs = 0;
  for (let i = 0; i < mate.length; i++) {
    const j = mate[i] ?? -1;
    if (j > i) pairs += 1;
  }
  assert.equal(pairs, 3, "blossom maximum cardinality = 3");
  console.log("  ✓ blossom: greedy-fail graph → 3 matches (not 2)");
}

{
  // Integration: encode same graph via gym isolation + ids
  // Vertex i gym = g{i}; edge only if different gym — complete multipartite
  // To restrict edges we place "blocked" pairs in SAME gym clusters carefully.
  //
  // Instead: 18 same-bout athletes, all different gyms → 9 matches + invariant
  const many: RecordMatchCandidate[] = [];
  for (let i = 0; i < 18; i++) {
    many.push(
      cand({
        id: `N${String(i).padStart(2, "0")}`,
        kg: 55 + i * 0.35,
        gymId: `g${i}`,
        totalBouts: 2,
      }),
    );
  }
  const started = Date.now();
  const r = pairWithRecordAndGrade(many, { forbidSameGym: true });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 5_000, `timeout ${elapsed}ms`);
  assert.equal(r.pairs.length, 9);
  assert.equal(r.unmatched.length, 0);
  assert.equal(findCompatibleUnmatchedPair(r.unmatched), null);
  // weight-proximal pairing preferred among max card
  const totalDiff = r.pairs.reduce((s, p) => s + (p.weightDiffKg ?? 0), 0);
  assert.ok(totalDiff < 18 * 0.4, `weight sum too large: ${totalDiff}`);
  console.log(`  ✓ n=18 blossom (${elapsed}ms) 9 matches + weight proximal`);
}

{
  // Compatible-unmatched invariant regression (n>=17)
  // Construct: 17 athletes, leave a forced odd one + ensure no compatible leftover
  const pool: RecordMatchCandidate[] = [];
  for (let i = 0; i < 17; i++) {
    pool.push(
      cand({
        id: `M${String(i).padStart(2, "0")}`,
        kg: 60 + (i % 7) * 0.2,
        gymId: `gym${i % 5}`,
        totalBouts: 3,
      }),
    );
  }
  const r = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  assert.equal(r.pairs.length + Math.floor(r.unmatched.length / 2) >= r.pairs.length, true);
  assert.equal(
    findCompatibleUnmatchedPair(r.unmatched, { forbidSameGym: true }),
    null,
    "unmatched must not contain hard-compatible pair",
  );
  // first-fit may be worse or equal — blossom must be >=
  const naive = naiveFirstFitCardinality(pool);
  assert.ok(
    r.pairs.length >= naive,
    `cardinality ${r.pairs.length} < naive ${naive}`,
  );
  console.log(
    `  ✓ n=17 invariant: pairs=${r.pairs.length} unmatched=${r.unmatched.length} (>= naive ${naive})`,
  );
}

{
  // Production-like hard rule: 고준혁(1전) ↔ 김강민(무전) never paired
  const ko = cand({ id: "ko", kg: 55, gymId: "workout", totalBouts: 1 });
  const kim = cand({ id: "kim", kg: 54.3, gymId: "larel", totalBouts: 0 });
  const pool = [
    ko,
    kim,
    ...Array.from({ length: 16 }, (_, i) =>
      cand({
        id: `z${i}`,
        kg: 50 + i,
        gymId: `zg${i}`,
        totalBouts: 0,
      }),
    ),
    cand({ id: "ko2", kg: 70, gymId: "other", totalBouts: 1 }),
  ];
  const r = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  assert.ok(!pairKeys(r).includes("kim-ko"), "무전↔1전 금지");
  assert.ok(pairKeys(r).includes("ko-ko2"), "1전끼리 매칭");
  // explain: 1전 선수 기준으로 가까운 무전 후보가 있을 때 문구
  const explained = explainRecordUnmatched(
    { ...ko, reason: "record_diff_too_large", reasonLabel: "x" },
    [ko, kim],
    { forbidSameGym: true },
  );
  assert.equal(explained.reasonCode, "record_diff");
  assert.ok(explained.reasonText.includes("무전"), explained.reasonText);
  assert.equal(
    findCompatibleUnmatchedPair(r.unmatched, { forbidSameGym: true }),
    null,
  );
  console.log("  ✓ 고준혁/김강민-style: hard zero_vs_nonzero + preview 문구");
}

{
  // Same max card → prefer closer weights (n=18 forces blossom path)
  const pool = [
    cand({ id: "A", kg: 55, gymId: "g0", totalBouts: 2 }),
    cand({ id: "B", kg: 55.7, gymId: "g1", totalBouts: 2 }),
    cand({ id: "C", kg: 64, gymId: "g2", totalBouts: 2 }),
    cand({ id: "D", kg: 64.5, gymId: "g3", totalBouts: 2 }),
    ...Array.from({ length: 14 }, (_, i) =>
      cand({
        id: `P${i}`,
        kg: 80 + i * 0.1,
        gymId: `gp${i}`,
        totalBouts: 2,
      }),
    ),
  ];
  const r = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  assert.equal(r.pairs.length, 9);
  const keys = pairKeys(r);
  assert.ok(keys.includes("A-B"), "55↔55.7");
  assert.ok(keys.includes("C-D"), "64↔64.5");
  console.log("  ✓ n=18 weight priority among max cardinality");
}

console.log("\nPASS verify-auto-match-large-cardinality\n");
