/**
 * 교차 경기구분 수동 복수 출전 SSOT
 *   npm run verify:bracket-multi-division-entry
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const autoMatch = readFileSync(
    join(process.cwd(), "src/lib/services/bracket-auto-match.service.ts"),
    "utf8",
  );
  const section = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
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

  assert.doesNotMatch(
    service,
    /이미 배정된 선수의 다른 경기구분 복수 출전은 아직 지원하지 않습니다/,
  );
  assert.doesNotMatch(
    service,
    /같은 경기구분 그룹에서만 추가 배정할 수 있습니다/,
  );

  assert.match(service, /eventWideManualPickOptions/);
  assert.match(service, /multi_division_manual_match/);
  assert.match(service, /retainedExistingMatches/);
  assert.match(service, /applicationDivisionMutated: false/);
  assert.doesNotMatch(service, /updateApplicationDivisionAssignment/);
  assert.match(service, /findApprovedApplicationForEventPlacement/);
  assert.match(service, /findApprovedApplicationForBracketPlacement/);

  assert.match(autoMatch, /listPlacedFighterIdsByDivision/);
  assert.doesNotMatch(
    autoMatch,
    /listPlacedFighterIdsForEvent\(eventId\)[\s\S]{0,120}already_placed/,
  );
  assert.match(
    autoMatch,
    /placedByDivision\.get\(row\.divisionId\)\?\.has\(row\.fighterId\)/,
  );

  assert.match(section, /eventWideManualPickOptions/);
  assert.match(panel, /allowDuplicateAssignment \|\| hasDuplicate/);

  console.log("verify:bracket-multi-division-entry OK");
}

main();
