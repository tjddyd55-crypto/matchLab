/**
 * Manual division gender/category compatibility guards.
 *   npm run verify:application-division-gender-compatibility
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "@/lib/errors/app-error";
import {
  assertApplicationDivisionCompatible,
  deriveManualDivisionOverrideState,
  filterCompatibleManualDivisions,
  isApplicationDivisionCompatible,
} from "../src/lib/applications/application-division-compatibility";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const femaleDiv = {
  id: "div-f",
  gender: "female",
  ageGroup: "고등부",
  sportType: "킥복싱",
};
const maleDiv = {
  id: "div-m",
  gender: "male",
  ageGroup: "고등부",
  sportType: "킥복싱",
};
const mmaDiv = {
  id: "div-mma",
  gender: "female",
  ageGroup: "고등부",
  sportType: "MMA",
};

function main() {
  assert.equal(
    isApplicationDivisionCompatible({
      fighterGender: "female",
      competitionCategory: "고등부",
      discipline: "킥복싱",
      division: femaleDiv,
    }),
    true,
  );
  assert.equal(
    isApplicationDivisionCompatible({
      fighterGender: "female",
      competitionCategory: "고등부",
      discipline: "킥복싱",
      division: maleDiv,
    }),
    false,
  );

  const filtered = filterCompatibleManualDivisions({
    divisions: [femaleDiv, maleDiv, mmaDiv],
    fighterGender: "female",
    competitionCategory: "고등부",
    discipline: "킥복싱",
  });
  assert.deepEqual(
    filtered.map((d) => d.id),
    ["div-f"],
  );

  assert.throws(
    () =>
      assertApplicationDivisionCompatible({
        fighterGender: "female",
        competitionCategory: "고등부",
        discipline: "킥복싱",
        division: maleDiv,
      }),
    (err: unknown) =>
      err instanceof AppError &&
      err.message.includes("선수 성별과 일치하지 않는 경기구분"),
  );

  assert.equal(
    deriveManualDivisionOverrideState({
      storedDivisionId: "div-f",
      autoSuggestedDivisionId: "div-f",
    }),
    false,
  );
  assert.equal(
    deriveManualDivisionOverrideState({
      storedDivisionId: "div-f",
      autoSuggestedDivisionId: "div-m",
    }),
    true,
  );

  const ui = read("src/components/domain/applications/ApplicationWeightAutoAssign.tsx");
  assert.match(ui, /filterCompatibleManualDivisions/);
  assert.match(ui, /compatibleManualDivisions\.map/);

  const lifecycle = read(
    "src/lib/services/application-organizer-lifecycle.service.ts",
  );
  assert.match(lifecycle, /assertApplicationDivisionCompatible/);
  assert.match(lifecycle, /deriveManualDivisionOverrideState/);
  assert.match(lifecycle, /appendApplicationStructuralAudit/);

  const actions = read("src/features/applications/actions.ts");
  assert.match(
    actions,
    /manualDivisionOverride: parseCheckboxOn\(formData, "manualDivisionOverride"\),/,
  );
  assert.doesNotMatch(actions, /Boolean\(divisionIdRaw\)/);

  const panel = read(
    "src/components/domain/applications/OrganizerApplicationEditPanel.tsx",
  );
  assert.match(panel, /res\.data\.manualDivisionOverride/);
  assert.doesNotMatch(panel, /Boolean\(res\.data\.divisionId\)/);

  const audit = read("src/lib/applications/application-structural-audit.ts");
  assert.match(audit, /event_application_structural_changed/);

  console.log("verify:application-division-gender-compatibility OK");
}

main();
