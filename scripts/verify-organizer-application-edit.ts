import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const lifecycle = read(
    "src/lib/services/application-organizer-lifecycle.service.ts",
  );
  assert.match(lifecycle, /updateOrganizerEventApplication/);
  assert.match(lifecycle, /resolveEventDivisionByApplicationWeight/);
  assert.match(lifecycle, /대진에 배정된 선수입니다/);
  assert.match(lifecycle, /encryptInsuranceResidentNumber/);
  assert.doesNotMatch(lifecycle, /decryptPiiUtf8/);

  const actions = read("src/features/applications/actions.ts");
  assert.match(actions, /updateOrganizerApplicationAction/);
  assert.match(actions, /getOrganizerApplicationEditFormAction/);

  const panel = read(
    "src/components/domain/applications/OrganizerApplicationEditPanel.tsx",
  );
  assert.match(panel, /신청 수정/);
  assert.match(panel, /updateOrganizerApplicationAction/);

  const row = read(
    "src/components/domain/applications/OrganizerApplicationRowActions.tsx",
  );
  assert.match(row, /수정/);
  assert.match(row, /OrganizerApplicationEditPanel/);

  console.log("verify:organizer-application-edit OK");
}

main();
