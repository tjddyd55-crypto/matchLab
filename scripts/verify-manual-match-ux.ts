/**
 * 수동 배정 UX — assignment summary / quick bar / sticky dock / picker portal
 *   npm run verify:manual-match-ux
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFighterAssignmentMap,
  formatAssignmentSummary,
  getPickerOptionSortTier,
} from "../src/lib/bracket-fighter-assignment";

function main() {
  const assignment = readFileSync(
    join(process.cwd(), "src/lib/bracket-fighter-assignment.ts"),
    "utf8",
  );
  const picker = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/ApprovedApplicationPicker.tsx",
    ),
    "utf8",
  );
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/ManualMatchCreatePanel.tsx",
    ),
    "utf8",
  );
  const section = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
    ),
    "utf8",
  );

  assert.match(assignment, /formatAssignmentSummary/);
  assert.match(assignment, /buildFighterAssignmentMap/);

  assert.match(picker, /role="listbox"/);
  assert.match(picker, /PICKER_GRID_CLASS|grid-cols-\[8rem/);
  assert.match(picker, /PickerGridHeader/);
  assert.match(picker, /buildPickerOptionColumns/);
  assert.match(picker, /pickerStatus/);
  assert.match(picker, /createPortal/);
  assert.match(picker, /position:\s*"fixed"/);
  assert.match(picker, /POPUP_MIN_WIDTH|560/);
  assert.match(picker, /scrollbar-gutter:stable/);

  assert.match(panel, /fixed bottom-0/);
  assert.match(panel, /activePickSlot/);
  assert.match(panel, /dockExpanded/);
  assert.match(panel, /onDockExpandedChange/);
  assert.match(panel, /ResizeObserver/);
  assert.match(panel, /h-11/);
  assert.match(panel, /max-h-\[32vh\]/);
  assert.match(panel, /buildManualMatchConfirmDescription/);

  assert.match(section, /전체 미배정/);
  assert.match(section, /EventWideUnmatchedQuickBar|전체 미배정 선수 빠른 배정/);
  assert.match(section, /dockExpanded/);
  assert.match(section, /onDockExpand/);
  assert.match(section, /홍코너에 배정/);
  assert.match(section, /경기 생성\]을 눌러주세요/);
  assert.match(section, /min-w-\[240px\]/);

  const map = buildFighterAssignmentMap([
    {
      id: "m1",
      matchOrder: 2,
      matchNumber: 3,
      globalMatchOrder: null,
      fighterRedId: "f1",
      fighterBlueId: null,
    } as never,
    {
      id: "m2",
      matchOrder: 5,
      matchNumber: 6,
      globalMatchOrder: null,
      fighterRedId: null,
      fighterBlueId: "f1",
    } as never,
  ]);
  const a1 = map.get("f1") ?? [];
  assert.equal(a1.length, 2);
  assert.match(formatAssignmentSummary(a1), /3.*홍.*6.*청|3경기.*6경기/);
  assert.equal(formatAssignmentSummary([]), "미배정");
  assert.equal(
    formatAssignmentSummary(a1.slice(0, 1), {
      currentMatchId: "m1",
      isCurrentSelection: true,
    }),
    "현재 선택 · 3경기 홍코너",
  );

  assert.equal(
    getPickerOptionSortTier({
      fighterId: "x",
      activeFighterId: "x",
      isOtherDivision: false,
      assignmentCount: 0,
    }),
    0,
  );

  console.log("verify:manual-match-ux OK");
}

main();
