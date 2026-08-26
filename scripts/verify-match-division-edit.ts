/**
 * 경기 카드 경기구분 편집 배선
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

  assert.match(card, /aria-label="경기구분"/);
  assert.match(card, /draftDivisionId/);
  assert.match(card, /divisionOptions/);
  assert.match(controls, /targetDivisionId/);
  assert.match(controls, /clearIncompatibleFighters/);
  assert.match(controls, /배정을 해제하고 변경하시겠습니까/);
  assert.match(service, /async changeMatchDivision/);
  assert.match(service, /clearIncompatibleFighters/);
  assert.match(service, /EventApplication\.divisionId는 변경하지 않는다/);
  assert.match(actions, /changeMatchDivision/);
  assert.match(validator, /changeMatchDivisionSchema/);

  console.log("verify:match-division-edit OK");
}

main();
