/**
 * 신청체중 파싱 + EventDivision 경계 매칭
 *
 *   npm run verify:application-weight-division-resolver
 */
import assert from "node:assert/strict";
import { parseApplicationWeightKg } from "../src/lib/applications/application-weight";
import { resolveEventDivisionByApplicationWeight } from "../src/lib/applications/resolve-event-division";
import type { DivisionResolverCandidate } from "../src/lib/applications/resolve-event-division";

function div(input: {
  id: string;
  ageGroup: string;
  gender?: string;
  name: string;
  limit: string;
  sport?: string;
}): DivisionResolverCandidate {
  return {
    id: input.id,
    sportType: input.sport ?? "킥복싱",
    ruleType: null,
    gender: input.gender ?? "male",
    ageGroup: input.ageGroup,
    weightClass: `${input.name} ${input.limit}`,
    weightClassName: input.name,
    weightLimitText: input.limit,
    skillLevel: null,
  };
}

const TABLE = [
  div({ id: "u55", ageGroup: "일반부", name: "플라이급", limit: "-55kg" }),
  div({ id: "u60", ageGroup: "일반부", name: "밴텀급", limit: "-60kg" }),
  div({ id: "u65", ageGroup: "일반부", name: "라이트급", limit: "-65kg" }),
  div({ id: "u70", ageGroup: "일반부", name: "웰터급", limit: "-70kg" }),
  div({ id: "o70", ageGroup: "일반부", name: "헤비급", limit: "+70kg" }),
];

function expectId(kg: number, id: string) {
  const result = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "성인",
    discipline: "킥복싱",
    applicationWeightKg: kg,
    divisions: TABLE,
  });
  assert.equal(result.ok, true, `${kg} should match`);
  if (result.ok) assert.equal(result.division.id, id, `${kg} → ${id}`);
}

function main() {
  assert.equal(parseApplicationWeightKg("62.5").ok, true);
  assert.equal(parseApplicationWeightKg("62.5kg").ok, true);
  assert.equal(parseApplicationWeightKg("62.5 KG").ok, true);
  assert.equal(parseApplicationWeightKg("62").ok, true);
  assert.equal(parseApplicationWeightKg("60대").ok, false);
  assert.equal(parseApplicationWeightKg("약 62").ok, false);
  assert.equal(parseApplicationWeightKg("62~63").ok, false);
  assert.equal(parseApplicationWeightKg("미정").ok, false);
  assert.equal(parseApplicationWeightKg("0").ok, false);

  const cases: Array<[number, string]> = [
    [54.0, "u55"],
    [54.9, "u55"],
    [55.0, "u55"],
    [55.1, "u60"],
    [59.9, "u60"],
    [60.0, "u60"],
    [60.1, "u65"],
    [64.9, "u65"],
    [65.0, "u65"],
    [65.1, "u70"],
    [70.0, "u70"],
    [70.1, "o70"],
  ];
  for (const [kg, id] of cases) expectId(kg, id);

  const adultAlias = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "성인",
    discipline: "킥복싱",
    applicationWeightKg: 62.5,
    divisions: TABLE,
  });
  assert.equal(adultAlias.ok, true);
  if (adultAlias.ok) assert.equal(adultAlias.division.id, "u65");

  const gapTable = [
    div({ id: "a", ageGroup: "일반부", name: "플라이", limit: "-55kg" }),
    div({ id: "b", ageGroup: "일반부", name: "밴텀", limit: "-60kg" }),
    div({ id: "c", ageGroup: "일반부", name: "헤비", limit: "+70kg" }),
  ];
  const gap = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "일반부",
    discipline: "킥복싱",
    applicationWeightKg: 62,
    divisions: gapTable,
  });
  assert.equal(gap.ok, false);
  if (!gap.ok) assert.equal(gap.code, "no_weight_match");

  const noTable = resolveEventDivisionByApplicationWeight({
    gender: "female",
    competitionCategory: "고등부",
    discipline: "MMA",
    applicationWeightKg: 55,
    divisions: TABLE,
  });
  assert.equal(noTable.ok, false);

  const over91 = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "일반부",
    discipline: "킥복싱",
    applicationWeightKg: 91,
    divisions: [
      div({ id: "sh", ageGroup: "대학·일반부", name: "슈퍼헤비", limit: "+91kg" }),
    ],
  });
  assert.equal(over91.ok, true);

  console.log("verify:application-weight-division-resolver OK");
}

main();
