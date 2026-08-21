/**
 * 1차 신청 validation — OTHER 분기 포함
 *   npm run verify:first-stage-registration
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateFirstStageApplication } from "../src/lib/applications/first-stage-application.ts";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function main() {
  const adult = validateFirstStageApplication({
    gymName: "테스트체육관",
    fighterName: "홍길동",
    gender: "male",
    birthDate: "1990-01-15",
    phone: "01012345678",
    competitionCategory: "일반부",
    divisionSelection: {
      selectionType: "OTHER",
      requestedDivisionText: "체급 협의",
    },
    record: { totalBouts: 1, wins: 1, draws: 0, losses: 0 },
    divisions: [],
  });
  assert.equal(adult.ok, true);
  if (adult.ok) {
    assert.equal(adult.value.selection.selectionType, "OTHER");
    assert.equal(adult.value.selection.divisionId, null);
    assert.equal(adult.value.isMinor, false);
  }

  const minorMissingGuardian = validateFirstStageApplication({
    gymName: "테스트체육관",
    fighterName: "김미성",
    gender: "male",
    birthDate: "2015-03-01",
    phone: "01011112222",
    competitionCategory: "초등부",
    divisionSelection: {
      selectionType: "OTHER",
      requestedDivisionText: "기타",
    },
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions: [],
  });
  assert.equal(minorMissingGuardian.ok, false);

  const src = read("src/lib/applications/first-stage-application.ts");
  assert.match(src, /export function validateFirstStageApplication/);
  assert.match(src, /OTHER/);
  assert.match(src, /isMinorBirthDate/);

  const form = read(
    "src/components/domain/applications/ExternalRegistrationPublicForm.tsx",
  );
  assert.match(form, /미성년 선수의 추가정보/);

  console.log("verify:first-stage-registration OK");
}

main();
