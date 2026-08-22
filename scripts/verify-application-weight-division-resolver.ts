/**
 * 신청체중 파싱 + EventDivision 경계 매칭
 *
 *   npm run verify:application-weight-division-resolver
 */
import assert from "node:assert/strict";
import { parseApplicationWeightKg } from "../src/lib/applications/application-weight";
import { resolveEventDivisionByApplicationWeight } from "../src/lib/applications/resolve-event-division";
import type { DivisionResolverCandidate } from "../src/lib/applications/resolve-event-division";
import { formatDivisionMainLabel } from "../src/lib/event-division-fields";
import {
  itemToEventDivisionRow,
  sanitizeTemplateItems,
} from "../src/lib/division-template/division-template-row";

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
    weightClass: `${input.name} ${input.limit}`.trim(),
    weightClassName: input.name || null,
    weightLimitText: input.limit || null,
    skillLevel: null,
  };
}

function unlimitedDiv(input: {
  id: string;
  ageGroup: string;
  gender?: string;
  name?: string;
  sport?: string;
}): DivisionResolverCandidate {
  return {
    id: input.id,
    sportType: input.sport ?? "킥복싱",
    ruleType: null,
    gender: input.gender ?? "male",
    ageGroup: input.ageGroup,
    weightClass: input.name?.trim() || null,
    weightClassName: input.name?.trim() || null,
    weightLimitText: null,
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
      div({
        id: "sh",
        ageGroup: "대학·일반부",
        name: "슈퍼헤비",
        limit: "+91kg",
      }),
    ],
  });
  assert.equal(over91.ok, true);

  // D: 무제한 division만 — 모든 체중 배정
  const onlyUnlimited = [unlimitedDiv({ id: "elem", ageGroup: "초등부" })];
  for (const kg of [25, 29, 37, 42, 55]) {
    const r = resolveEventDivisionByApplicationWeight({
      gender: "male",
      competitionCategory: "초등부",
      discipline: "킥복싱",
      applicationWeightKg: kg,
      divisions: onlyUnlimited,
    });
    assert.equal(r.ok, true, `D ${kg}kg should match unlimited`);
    if (r.ok) assert.equal(r.division.id, "elem");
  }
  assert.equal(
    formatDivisionMainLabel({
      ageGroup: "초등부",
      gender: "male",
      weightClassName: null,
      weightLimitText: null,
      weightClass: null,
    }),
    "초등부 · 남성",
  );

  // E: 제한 + 무제한 혼합 — 구체 우선, 무제한 fallback
  const mixed = [
    div({ id: "e30", ageGroup: "초등부", name: "", limit: "-30kg" }),
    div({ id: "e40", ageGroup: "초등부", name: "", limit: "-40kg" }),
    unlimitedDiv({ id: "e-open", ageGroup: "초등부" }),
  ];
  const e28 = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "초등부",
    discipline: "킥복싱",
    applicationWeightKg: 28,
    divisions: mixed,
  });
  assert.equal(e28.ok, true);
  if (e28.ok) assert.equal(e28.division.id, "e30");
  const e35 = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "초등부",
    discipline: "킥복싱",
    applicationWeightKg: 35,
    divisions: mixed,
  });
  assert.equal(e35.ok, true);
  if (e35.ok) assert.equal(e35.division.id, "e40");
  const e50 = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "초등부",
    discipline: "킥복싱",
    applicationWeightKg: 50,
    divisions: mixed,
  });
  assert.equal(e50.ok, true);
  if (e50.ok) assert.equal(e50.division.id, "e-open");

  // F: 무제한 중복 → ambiguous
  const dupUnlimited = resolveEventDivisionByApplicationWeight({
    gender: "male",
    competitionCategory: "초등부",
    discipline: "킥복싱",
    applicationWeightKg: 40,
    divisions: [
      unlimitedDiv({ id: "u1", ageGroup: "초등부" }),
      unlimitedDiv({ id: "u2", ageGroup: "초등부" }),
    ],
  });
  assert.equal(dupUnlimited.ok, false);
  if (!dupUnlimited.ok) assert.equal(dupUnlimited.code, "ambiguous");

  // template → EventDivision: 체급명·체중 없어도 ageGroup만으로 생성
  const row = itemToEventDivisionRow("킥복싱", {
    sportType: "킥복싱",
    gender: "male",
    ageGroup: "초등부",
    weightClassName: null,
    weightLimitText: null,
    weightLimitKg: null,
    limitType: null,
    weightClass: null,
    skillLevel: null,
    displayOrder: 0,
    isActive: true,
  });
  assert.ok(row);
  assert.equal(row!.ageGroup, "초등부");
  assert.equal(row!.weightClassName, null);
  assert.equal(row!.weightLimitText, null);

  const sanitized = sanitizeTemplateItems(
    [
      {
        sportType: "킥복싱",
        gender: "male",
        ageGroup: "초등부",
        weightClassName: "",
        weightLimitText: "",
        weightLimitKg: null,
        limitType: null,
        weightClass: null,
        skillLevel: null,
        displayOrder: 0,
        isActive: true,
      },
    ],
    "킥복싱",
  );
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0]!.weightClassName, null);
  assert.equal(sanitized[0]!.weightLimitText, null);

  console.log("verify:application-weight-division-resolver OK");
}

main();
