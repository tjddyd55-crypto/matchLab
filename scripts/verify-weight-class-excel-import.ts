/**
 * Division template / weight-class excel import static verifies.
 *
 *   npx tsx scripts/verify-weight-class-excel-import.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildKickboxingWeightClassFixtureItems,
  countKickboxingFixtureBySection,
  KICKBOXING_WEIGHT_CLASS_FIXTURE_COUNT,
} from "../src/lib/division-template/kickboxing-weight-classes.fixture";
import {
  analyzeWeightClassWorkbook,
  buildWeightClassSampleWorkbook,
  itemIdentityKey,
  mergeWeightClassImportIntoItems,
  parseGenderLabel,
  parseOperatorLabel,
  workbookToBuffer,
} from "../src/lib/division-template/weight-class-excel";
import { formatWeightLimitText } from "../src/lib/division-template/division-template-parse";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

async function main() {
  // fixture counts
  const items = buildKickboxingWeightClassFixtureItems("kickboxing");
  assert.equal(items.length, KICKBOXING_WEIGHT_CLASS_FIXTURE_COUNT);
  const sections = countKickboxingFixtureBySection();
  assert.equal(sections["초등부|male"], 7);
  assert.equal(sections["초등부|female"], 6);
  assert.equal(sections["중등부|male"], 8);
  assert.equal(sections["중등부|female"], 7);
  assert.equal(sections["고등부|male"], 9);
  assert.equal(sections["고등부|female"], 7);
  assert.equal(sections["대학·일반부|male"], 13);
  assert.equal(sections["대학·일반부|female"], 9);
  console.log("verify:weight-class-template OK (fixture 66)");

  // decimal + over
  assert.equal(formatWeightLimitText(63.5, "under"), "-63.5kg");
  assert.equal(formatWeightLimitText(91, "over"), "+91kg");
  const lightWelter = items.find(
    (i) =>
      i.ageGroup === "고등부" &&
      i.gender === "male" &&
      i.weightClassName === "라이트웰터급",
  );
  assert.ok(lightWelter);
  assert.equal(lightWelter!.weightLimitText, "-63.5kg");
  assert.equal(lightWelter!.weightLimitKg, 63.5);
  console.log("verify:weight-class-boundaries OK");

  // labels
  assert.equal(parseGenderLabel("남성"), "male");
  assert.equal(parseGenderLabel("여성"), "female");
  assert.equal(parseOperatorLabel("이하"), "under");
  assert.equal(parseOperatorLabel("초과"), "over");

  // sample excel round-trip
  const wb = await buildWeightClassSampleWorkbook({
    includeKickboxingFixture: true,
  });
  const buf = await workbookToBuffer(wb);
  const preview = await analyzeWeightClassWorkbook({
    fileName: "MATCHON_체급표_업로드_샘플.xlsx",
    buffer: buf,
    sportType: "kickboxing",
    existingItems: [],
  });
  assert.equal(preview.totalRows, 66);
  assert.equal(preview.counts.create, 66);
  assert.equal(preview.counts.error, 0);
  assert.equal(preview.counts.conflict, 0);
  console.log("verify:weight-class-excel-parser OK");

  const merged = mergeWeightClassImportIntoItems({
    existingItems: [],
    preview,
  });
  assert.equal(merged.length, 66);
  console.log("verify:weight-class-excel-import OK");

  // idempotency
  const preview2 = await analyzeWeightClassWorkbook({
    fileName: "MATCHON_체급표_업로드_샘플.xlsx",
    buffer: buf,
    sportType: "kickboxing",
    existingItems: merged,
  });
  assert.equal(preview2.counts.create, 0);
  assert.equal(preview2.counts.skipExisting, 66);
  assert.equal(preview2.counts.error, 0);
  const merged2 = mergeWeightClassImportIntoItems({
    existingItems: merged,
    preview: preview2,
  });
  assert.equal(merged2.length, 66);
  const keys = new Set(merged2.map((i) => itemIdentityKey(i)));
  assert.equal(keys.size, 66);
  console.log("verify:weight-class-import-idempotency OK");

  // static scope / UI wiring
  const editor = read(
    "src/components/domain/division-templates/DivisionTemplateEditor.tsx",
  );
  assert.match(editor, /DivisionTemplateExcelToolbar/);
  assert.match(editor, /엑셀/);
  const svc = read("src/lib/services/division-template.service.ts");
  assert.match(svc, /assertTemplateOwned/);
  assert.match(svc, /organizerId/);
  console.log("verify:weight-class-import-scope OK");

  // schema still JSON items — no separate WeightClass table required
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model DivisionTemplate/);
  assert.match(schema, /items\s+Json/);
  console.log("verify:weight-class-excel-import suite OK (no DB migration)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
