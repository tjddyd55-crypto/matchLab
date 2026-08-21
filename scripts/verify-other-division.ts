/**
 * OTHER 체급 선택 — divisionId null + 라벨
 *   npm run verify:other-division
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatApplicationDivisionLabel } from "../src/lib/applications/application-division-label.ts";
import {
  DIVISION_SELECTION_OTHER_LABEL,
  resolveDivisionSelection,
} from "../src/lib/applications/division-selection.ts";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function main() {
  assert.equal(DIVISION_SELECTION_OTHER_LABEL, "기타");

  const other = resolveDivisionSelection({
    gender: "male",
    competitionCategory: "일반부",
    weightClassLabel: "기타",
    otherDetailText: "협의 필요",
    divisions: [],
  });
  assert.equal(other.ok, true);
  if (other.ok) {
    assert.equal(other.selection.selectionType, "OTHER");
    assert.equal(other.selection.divisionId, null);
  }

  assert.equal(
    formatApplicationDivisionLabel({
      division: null,
      divisionSelectionType: "OTHER",
      requestedDivisionText: "플라이급 협의",
    }),
    "기타 · 플라이급 협의",
  );

  const schema = read("prisma/schema.prisma");
  assert.match(schema, /enum DivisionSelectionType/);
  assert.match(schema, /OTHER/);
  assert.match(schema, /divisionId\s+String\?/);

  const first = read("src/lib/applications/first-stage-application.ts");
  assert.match(first, /selectionType:\s*"OTHER"/);
  assert.match(first, /validateFirstStageApplication/);

  console.log("verify:other-division OK");
}

main();
