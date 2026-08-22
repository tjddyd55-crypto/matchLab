/**
 * Manual match unmatched source SSOT
 *   npm run verify:manual-match-unmatched-source
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
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

  // drag source = unassigned group only (assignable && not placed)
  assert.match(section, /classifyCandidate/);
  assert.match(section, /isAssignableForBracket/);
  assert.match(section, /grouped\.unassigned/);
  assert.match(section, /eventWideUnmatchedOptions/);
  assert.match(section, /전체 미매칭/);
  assert.match(section, /UnmatchedDraggableCardShell/);

  // create path re-checks unmatched on server (event-wide, not bracket-only)
  assert.match(service, /countFighterAssignmentsInEvent/);
  assert.match(service, /findApprovedApplicationForEventPlacement/);
  assert.match(service, /createManualMatchWithPair/);

  console.log("verify:manual-match-unmatched-source OK");
}

main();
