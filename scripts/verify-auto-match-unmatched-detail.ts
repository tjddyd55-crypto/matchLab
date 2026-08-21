/**
 * verify:auto-match-unmatched-detail
 * 미매칭 설명 metadata — 알고리즘 pairing 결과는 바꾸지 않고 설명만 검증.
 * Preview UX: 미리보기 → 바로 AutoBracketPreviewDialog (inline panel 없음)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pairWithRecordAndGrade } from "../src/lib/brackets/record-auto-match";
import type { RecordMatchCandidate } from "../src/lib/brackets/record-auto-match";
import {
  explainRecordUnmatched,
  formatAutoMatchRecordText,
} from "../src/lib/brackets/explain-record-unmatched";

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
    applicationWeightKg: null,
  };
}

console.log("\n[미매칭 상세 설명]");

{
  const pool = [
    makeCandidate("a", 0, "gym1"),
    makeCandidate("b", 0, "gym1"),
    makeCandidate("c", 3, "gym2"),
  ];
  const pairing = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  assert.equal(pairing.pairs.length, 0);
  assert.equal(pairing.unmatched.length, 3);
  const zero = pairing.unmatched.find((u) => u.applicationId === "a")!;
  const explained = explainRecordUnmatched(zero, pool, { forbidSameGym: true });
  assert.equal(explained.reasonCode, "same_gym");
  assert.ok(explained.reasonText.includes("같은 체육관"));
  assert.ok(explained.candidateCount >= 2);
  assert.ok(explained.excludedSameGymCount >= 1);
  console.log("  ✓ 무전 + 같은 체육관만 → same_gym 구분");
}

{
  const pool = [
    makeCandidate("solo", 0, "gym1"),
    makeCandidate("pro", 5, "gym2"),
  ];
  const pairing = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  const zero = pairing.unmatched.find((u) => u.applicationId === "solo")!;
  const explained = explainRecordUnmatched(zero, pool, { forbidSameGym: true });
  assert.equal(explained.reasonCode, "no_zero_candidate");
  assert.ok(explained.reasonText.includes("무전"));
  console.log("  ✓ 무전 상대 없음 → no_zero_candidate");
}

{
  const pool = [
    makeCandidate("a", 8, "gym1"),
    makeCandidate("b", 1, "gym2"),
    makeCandidate("c", 1, "gym3"),
  ];
  const pairing = pairWithRecordAndGrade(pool, { forbidSameGym: true });
  const heavy = pairing.unmatched.find((u) => u.applicationId === "a");
  assert.ok(heavy);
  const explained = explainRecordUnmatched(heavy!, pool, {
    forbidSameGym: true,
  });
  assert.equal(explained.reasonCode, "record_diff");
  assert.ok(
    explained.reasonText.includes("전") ||
      explained.reasonText.includes("전적"),
  );
  console.log("  ✓ 전적 차이 → record_diff + 구체 문구");
}

assert.equal(formatAutoMatchRecordText({ totalBouts: 0 }), "무전");
assert.equal(
  formatAutoMatchRecordText({
    totalBouts: 6,
    wins: 3,
    draws: 0,
    losses: 3,
  }),
  "6전 3승 3패",
);
assert.equal(formatAutoMatchRecordText({ totalBouts: null }), "전적 정보 없음");

const panel = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/AutoBracketGenerationPanel.tsx"),
  "utf8",
);
assert.ok(!panel.includes("미매칭 상세 미리보기"));
assert.ok(!panel.includes("max-h-40 space-y-1 overflow-y-auto"));
assert.ok(panel.includes("AutoBracketPreviewDialog"));
assert.ok(panel.includes("setPreviewDialogOpen(true)"));
assert.ok(panel.includes('previewOnly'));

const dialog = readFileSync(
  join(
    process.cwd(),
    "src/components/domain/brackets/UnmatchedAutoMatchDetailDialog.tsx",
  ),
  "utf8",
);
assert.ok(dialog.includes("자동매칭 미리보기"));
assert.ok(dialog.includes("!max-w-[1100px]"));
assert.ok(dialog.includes("max-h-[85vh]"));
assert.ok(dialog.includes("formControlFieldClass"));
assert.ok(dialog.includes("appliedWeightLabel"));
assert.ok(dialog.includes("formatCandidateCount"));

const service = readFileSync(
  join(process.cwd(), "src/lib/services/bracket-auto-match.service.ts"),
  "utf8",
);
assert.ok(service.includes("explainRecordUnmatched"));
assert.ok(service.includes("candidateFlowText"));
assert.ok(service.includes("formatPreviewApplicationRecord"));
assert.ok(service.includes("buildUnmatchedDetailBase"));

console.log("\nverify-auto-match-unmatched-detail: PASS");
