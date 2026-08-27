/**
 * Matched athlete edit submit — disabled structural fields must still reach the action.
 *   npm run verify:matched-athlete-edit-submit
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/applications/OrganizerApplicationEditPanel.tsx",
    ),
    "utf8",
  );
  const lifecycle = readFileSync(
    join(
      process.cwd(),
      "src/lib/services/application-organizer-lifecycle.service.ts",
    ),
    "utf8",
  );
  const actions = readFileSync(
    join(process.cwd(), "src/features/applications/actions.ts"),
    "utf8",
  );

  assert.match(
    panel,
    /structuralEditBlocked[\s\S]*name="gender"/,
    "blocked gender must submit via hidden input",
  );
  assert.match(
    panel,
    /fd\.set\("gender", gender\)/,
    "submit must force gender when structuralEditBlocked",
  );
  assert.match(
    panel,
    /저장하지 못했습니다/,
    "save errors must be visible (no silent failure)",
  );
  assert.match(
    panel,
    /DialogFooter[\s\S]*error/,
    "error must render in sticky footer, not only scroll body",
  );

  assert.match(
    lifecycle,
    /linkedGymIsPlaceholder/,
    "placeholder gym must open in manual gymMode",
  );
  assert.match(
    lifecycle,
    /structuralLocked && existing\.divisionId/,
    "matched edit must pin existing division for safe-field saves",
  );
  assert.match(
    lifecycle,
    /resyncFighterMatchSnapshotsForEvent/,
    "application update must resync match snapshots",
  );
  assert.doesNotMatch(
    lifecycle,
    /gymRepository\.update|gym\.update\(/,
    "must not rename Gym master on application edit",
  );

  assert.match(
    actions,
    /성별 정보가 전달되지 않았습니다/,
    "action must fail loudly when gender omitted",
  );

  console.log("verify:matched-athlete-edit-submit OK");
}

main();
