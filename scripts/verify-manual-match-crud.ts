/**
 * 수동 경기 CRUD 배선 (정적)
 *   npm run verify:manual-match-crud
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const actions = readFileSync(
    join(process.cwd(), "src/features/brackets/actions.ts"),
    "utf8",
  );
  const editor = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/MatchListEditor.tsx"),
    "utf8",
  );
  const card = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/OrganizerMatchEditCard.tsx",
    ),
    "utf8",
  );

  assert.match(service, /addEmptyBracketMatch/);
  assert.match(service, /deleteBracketMatch/);
  assert.match(service, /ensureBracketShellForDivision/);
  assert.match(actions, /addEmptyBracketMatchAction/);
  assert.match(actions, /deleteBracketMatchAction/);
  assert.match(actions, /ensureBracketForDivisionAction/);
  assert.match(editor, /addEmptyBracketMatchAction/);
  assert.match(editor, /경기 추가/);
  assert.match(card, /deleteBracketMatchAction/);

  console.log("verify:manual-match-crud OK");
}

main();
