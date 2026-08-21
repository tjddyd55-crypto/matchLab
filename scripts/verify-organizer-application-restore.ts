import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const snap = read("src/lib/applications/cancel-restore-snapshot.ts");
  assert.match(snap, /_matchonCancelRestore/);
  assert.match(snap, /inferRestoreStatus/);

  const lifecycle = read(
    "src/lib/services/application-organizer-lifecycle.service.ts",
  );
  assert.match(lifecycle, /restoreOrganizerCancelledApplication/);
  assert.match(lifecycle, /restoreGymCancelledApplication/);
  assert.match(lifecycle, /cancellationSource: null/);

  const bulk = read(
    "src/lib/services/application-organizer-bulk.service.ts",
  );
  assert.match(bulk, /buildCancelRestorePatch/);

  const row = read(
    "src/components/domain/applications/OrganizerApplicationRowActions.tsx",
  );
  assert.match(row, /취소 복구/);
  assert.match(row, /체육관취소 복구/);
  assert.match(row, /restoreOrganizerCancelledApplicationAction/);

  console.log("verify:organizer-application-restore OK");
}

main();
