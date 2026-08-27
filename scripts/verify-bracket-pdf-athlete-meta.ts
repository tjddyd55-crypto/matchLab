/**
 * Bracket PDF athlete meta — detailed vs court formatters.
 *   npm run verify:bracket-pdf-detailed-athlete-meta
 *   npm run verify:court-pdf-gender-record-meta
 *   npm run verify:bracket-pdf-application-weight-source
 *   npm run verify:bracket-pdf-meta-null-safe
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildBracketPrintFighterDto,
  formatApplicationWeightLabel,
  formatCourtPrintFighterMeta,
  formatDetailedPrintFighterMeta,
  parseApplicationWeightKgFromSnapshot,
  resolveBracketPrintFighterMetaLine,
} from "../src/lib/brackets/bracket-print-format";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function testStaticWiring() {
  const doc = read("src/components/domain/brackets/BracketPrintDocument.tsx");
  assert.match(doc, /resolveBracketPrintFighterMetaLine/);
  assert.match(doc, /printMode/);
  assert.doesNotMatch(
    doc,
    /ops-print-record">\{fighter\.recordDisplayLabel\}/,
  );

  const format = read("src/lib/brackets/bracket-print-format.ts");
  assert.match(format, /formatDetailedPrintFighterMeta/);
  assert.match(format, /formatCourtPrintFighterMeta/);
  assert.match(format, /parseApplicationWeightKgFromSnapshot/);

  const service = read("src/lib/services/bracket-print.service.ts");
  assert.match(service, /ageGroupLabel/);
  assert.match(service, /formatMatchWeightKgLabel\(m\.matchWeightKg\)/);
}

function testDetailedMeta() {
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
}

function testCourtMeta() {
  const male = buildBracketPrintFighterDto({
    name: "한현준",
    gymNameSnapshot: "산본더원",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 71 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 3,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  const court = formatCourtPrintFighterMeta(male);
  assert.equal(court, "남 · 무전");
  assert.doesNotMatch(court ?? "", /중등부|중3|71kg/);
  assert.equal(
    resolveBracketPrintFighterMetaLine({ fighter: male, mode: "court" }),
    "남 · 무전",
  );
}

function testApplicationWeightSource() {
  assert.equal(parseApplicationWeightKgFromSnapshot({ applicationWeightKg: 66 }), 66);
  assert.equal(formatApplicationWeightLabel(66), "66kg");
  assert.equal(
    parseApplicationWeightKgFromSnapshot({ matchWeightKg: 68 }),
    null,
  );
  const f = buildBracketPrintFighterDto({
    name: "A",
    gymNameSnapshot: "G",
    gymSnapshot: null,
    fighterSnapshot: { applicationWeightKg: 66, matchWeightKg: 68 },
    schoolLevelSnapshot: "MIDDLE",
    schoolGradeSnapshot: 2,
    totalBoutsSnapshot: 0,
    winsSnapshot: 0,
    drawsSnapshot: 0,
    lossesSnapshot: 0,
    genderLabel: "남성",
  });
  assert.equal(f.weightLabel, "66kg");
  const detailed = formatDetailedPrintFighterMeta(f, { ageGroupLabel: "중등부" });
  assert.match(detailed ?? "", /66kg/);
  assert.doesNotMatch(detailed ?? "", /68kg/);
}

function testNullSafe() {
  const partial = buildBracketPrintFighterDto({
    name: "부분",
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
    /·\s*·/,
  );
}

function main() {
  testStaticWiring();
  testDetailedMeta();
  testCourtMeta();
  testApplicationWeightSource();
  testNullSafe();
  console.log("verify:bracket-pdf-detailed-athlete-meta OK");
  console.log("verify:court-pdf-gender-record-meta OK");
  console.log("verify:bracket-pdf-application-weight-source OK");
  console.log("verify:bracket-pdf-meta-null-safe OK");
}

main();
