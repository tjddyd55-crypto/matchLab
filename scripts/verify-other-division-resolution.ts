/**
 * OTHER → EventDivision 지정 서버 규칙 (정적)
 *   npm run verify:other-division-resolution
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/application.service.ts"),
    "utf8",
  );
  const dialog = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/applications/OrganizerResolveOtherDivisionDialog.tsx",
    ),
    "utf8",
  );
  const actions = readFileSync(
    join(process.cwd(), "src/features/applications/actions.ts"),
    "utf8",
  );

  assert.match(service, /resolveOtherDivisionApplication/);
  assert.match(service, /divisionSelectionType:\s*"REGISTERED"/);
  assert.match(service, /requestedDivisionText/);
  assert.match(service, /divisionGenderAllowsFighter/);
  assert.match(service, /이 대회의 체급만/);

  assert.match(actions, /resolveOtherDivisionAction/);
  assert.match(dialog, /체급 지정/);
  assert.match(dialog, /기타 요청/);
  assert.match(dialog, /resolveOtherDivisionAction/);

  const rowActions = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/applications/OrganizerApplicationRowActions.tsx",
    ),
    "utf8",
  );
  assert.match(rowActions, /체급 지정/);
  assert.match(rowActions, /divisionReviewRequired/);

  console.log("verify:other-division-resolution OK");
}

main();
