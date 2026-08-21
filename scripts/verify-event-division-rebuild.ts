/**
 * 체급표 재구성 재배정 plan 단위 검증 (DB 없음).
 *
 *   npm run verify:event-division-rebuild
 */
import assert from "node:assert/strict";
import { planDivisionRebuildAssignments } from "../src/lib/services/event-division-rebuild-plan";
import type { DivisionRebuildAppInput } from "../src/lib/services/event-division-rebuild-plan";
import type { EventDivisionFromTemplateRow } from "../src/lib/division-template/division-template-row";

function division(
  id: string,
  limit: string,
  name: string,
): EventDivisionFromTemplateRow & { id: string } {
  return {
    id,
    sportType: "킥복싱",
    ruleType: null,
    gender: "male",
    ageGroup: "일반부",
    weightClass: `${name} ${limit}`,
    weightClassName: name,
    weightLimitText: limit,
    skillLevel: null,
  };
}

function app(input: {
  id: string;
  kg: number | null;
  ageGroup?: string;
  selection?: "REGISTERED" | "OTHER";
  requested?: string | null;
}): DivisionRebuildAppInput {
  return {
    id: input.id,
    divisionSelectionType: input.selection ?? "REGISTERED",
    requestedDivisionText: input.requested ?? null,
    fighterSnapshot: {
      name: `선수${input.id}`,
      applicationWeightKg: input.kg,
    },
    gymSnapshot: { name: "테스트관" },
    gymNameSnapshot: "테스트관",
    fighter: { id: `f-${input.id}`, name: `선수${input.id}`, gender: "male" },
    division: {
      id: "old-div",
      sportType: "킥복싱",
      gender: "male",
      ageGroup: input.ageGroup ?? "일반부",
      weightClass: "웰터급 -67kg",
      weightClassName: "웰터급",
      weightLimitText: "-67kg",
      skillLevel: null,
      ruleType: null,
    },
    gym: { id: "g1", name: "테스트관" },
  };
}

function main() {
  const table = [
    division("u60", "-60kg", "밴텀급"),
    division("u65", "-65kg", "라이트급"),
    division("u70", "-70kg", "웰터급"),
  ];

  const full = planDivisionRebuildAssignments({
    apps: [app({ id: "a1", kg: 58 }), app({ id: "a2", kg: 64.5 })],
    divisionRows: table,
    templateSportType: "킥복싱",
  });
  assert.equal(full.autoReassign, 2);
  assert.equal(full.needsReview, 0);
  assert.equal(full.unassigned, 0);
  assert.equal(full.plans[0]?.targetDivisionId, "u60");
  assert.equal(full.plans[1]?.targetDivisionId, "u65");

  const unassigned = planDivisionRebuildAssignments({
    apps: [app({ id: "b1", kg: null }), app({ id: "b2", kg: 90 })],
    divisionRows: table,
    templateSportType: "킥복싱",
  });
  assert.equal(unassigned.autoReassign, 0);
  assert.ok(unassigned.unassigned >= 2);
  assert.equal(unassigned.plans.every((p) => p.targetDivisionId == null), true);

  const other = planDivisionRebuildAssignments({
    apps: [
      app({
        id: "c1",
        kg: 60,
        selection: "OTHER",
        requested: "웰터급 -70kg",
      }),
      app({
        id: "c2",
        kg: 60,
        selection: "OTHER",
        requested: "없는체급 XYZ",
      }),
    ],
    divisionRows: table,
    templateSportType: "킥복싱",
  });
  assert.equal(other.plans[0]?.reasonCode, "other_exact");
  assert.equal(other.plans[0]?.targetDivisionId, "u70");
  assert.equal(other.plans[1]?.reasonCode, "other_unmatched");
  assert.equal(other.plans[1]?.targetDivisionId, null);

  const ambiguousTable = [
    division("dup1", "-65kg", "라이트급"),
    division("dup2", "-65kg", "라이트급"),
  ];
  ambiguousTable[1]!.weightClass = "라이트급 -65kg";
  const amb = planDivisionRebuildAssignments({
    apps: [app({ id: "d1", kg: 63 })],
    divisionRows: ambiguousTable,
    templateSportType: "킥복싱",
  });
  assert.equal(amb.plans[0]?.targetDivisionId, null);
  assert.ok(amb.needsReview + amb.unassigned >= 1);

  console.log("PASS verify-event-division-rebuild");
}

main();
