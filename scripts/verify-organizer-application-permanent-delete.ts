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
  assert.match(lifecycle, /permanentlyDeleteOrganizerApplication/);
  assert.match(lifecycle, /eventApplication\.delete/);
  assert.match(lifecycle, /대진에 배정된 신청자는 바로 삭제할 수 없습니다/);
  assert.match(lifecycle, /계체 기록이 있는 신청자는 삭제할 수 없습니다/);
  assert.match(lifecycle, /경기 결과가 있는 신청자는 삭제할 수 없습니다/);
  assert.match(lifecycle, /입금\/결제 기록이 있는 신청자는/);
  assert.doesNotMatch(lifecycle, /cascade.*Match/i);

  const row = read(
    "src/components/domain/applications/OrganizerApplicationRowActions.tsx",
  );
  assert.match(row, /영구 삭제/);
  assert.match(row, /variant: \"danger\"/);
  assert.match(row, /permanentlyDeleteOrganizerApplicationAction/);
  assert.match(row, /useAppConfirmDialog/);
  assert.doesNotMatch(row, /\bwindow\.confirm\b/);

  console.log("verify:organizer-application-permanent-delete OK");
  console.log("verify:application-delete-dependency-guard OK");
}

main();
