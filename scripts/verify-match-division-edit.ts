/**
 * 경기 카드 경기구분 편집 — 선수 유지 · EA 불변 · pending 안전
 *   npm run verify:match-division-edit
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const root = process.cwd();
  const card = readFileSync(
    join(root, "src/components/domain/brackets/OrganizerMatchEditCard.tsx"),
    "utf8",
  );
  const controls = readFileSync(
    join(root, "src/components/domain/brackets/MatchEditControlsRow.tsx"),
    "utf8",
  );
  const courtControls = readFileSync(
    join(root, "src/components/domain/courts/MatchCourtControls.tsx"),
    "utf8",
  );
  const service = readFileSync(
    join(root, "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const actions = readFileSync(
    join(root, "src/features/event-courts/actions.ts"),
    "utf8",
  );
  const validator = readFileSync(
    join(root, "src/lib/validators/bracket.validator.ts"),
    "utf8",
  );
  const lifecycle = readFileSync(
    join(
      root,
      "src/lib/services/application-organizer-lifecycle.service.ts",
    ),
    "utf8",
  );

  assert.match(card, /aria-label="경기구분"/);
  assert.match(card, /draftDivisionId/);
  assert.match(card, /divisionOptions/);
  assert.match(controls, /targetDivisionId/);
  assert.doesNotMatch(controls, /clearIncompatibleFighters/);
  assert.doesNotMatch(controls, /배정을 해제하고 변경하시겠습니까/);
  assert.match(service, /async changeMatchDivision/);
  assert.match(service, /retainedFighters: true/);
  assert.match(service, /applicationDivisionMutated: false/);
  assert.match(service, /EventApplication\.divisionId는 변경하지 않는다/);
  assert.doesNotMatch(service, /DIVISION_INCOMPATIBLE_FIGHTERS/);
  assert.doesNotMatch(service, /비호환 선수 해제/);
  assert.match(actions, /changeMatchDivision/);
  assert.doesNotMatch(actions, /clearIncompatibleFighters/);
  assert.match(validator, /changeMatchDivisionSchema/);

  // pending must terminate (try/finally, not useTransition+async hang)
  assert.match(courtControls, /setPending\(true\)/);
  assert.match(courtControls, /finally \{\s*setPending\(false\)/);
  assert.doesNotMatch(courtControls, /useTransition/);

  // application edit: bracket assignment is not a structural block
  assert.doesNotMatch(
    lifecycle,
    /이미 대진에 배정된 선수입니다\. 경기구분\/체급을 변경하려면/,
  );
  assert.match(
    lifecycle,
    /const structuralEditBlocked = deps\.hasMatchResult \|\| deps\.hasWeighIn/,
  );
  assert.match(
    lifecycle,
    /신청정보가 변경되어도 현재 편성된 대진은 자동으로 변경되지 않습니다/,
  );

  console.log("verify:match-division-edit OK");
}

main();
