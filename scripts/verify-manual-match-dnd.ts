/**
 * Manual match DnD UX — static source invariants
 *   npm run verify:manual-match-dnd
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const panel = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/ManualMatchCreatePanel.tsx"),
    "utf8",
  );
  const section = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
    ),
    "utf8",
  );
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const actions = readFileSync(
    join(process.cwd(), "src/features/brackets/actions.ts"),
    "utf8",
  );

  assert.match(panel, /수동 경기 만들기/);
  assert.match(panel, /홍코너/);
  assert.match(panel, /청코너/);
  assert.match(panel, /createManualMatchWithPairAction/);
  assert.match(panel, /AppConfirmDialog|useAppConfirmDialog/);
  assert.match(panel, /UNMATCHED_DND_MIME|setUnmatchedDragPayload/);
  assert.equal(panel.includes("window.confirm"), false);

  assert.match(section, /ManualMatchCreatePanel/);
  assert.match(section, /UnmatchedDraggableCardShell/);
  assert.match(section, /미매칭 선수/);

  assert.match(service, /createManualMatchWithPair/);
  assert.match(
    service,
    /선수 배정 상태가 변경되었습니다/,
  );
  assert.match(actions, /createManualMatchWithPairAction/);

  console.log("verify:manual-match-dnd OK");
}

main();
