/**
 * 배정된 신청자 application edit 허용
 *   npm run verify:assigned-application-edit
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const lifecycle = readFileSync(
    join(
      process.cwd(),
      "src/lib/services/application-organizer-lifecycle.service.ts",
    ),
    "utf8",
  );
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/applications/OrganizerApplicationEditPanel.tsx",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    lifecycle,
    /이미 대진에 배정된 선수입니다\. 경기구분\/체급을 변경하려면/,
  );
  assert.doesNotMatch(
    lifecycle,
    /대진 배정 상태입니다\. 성별·체급 변경 전 대진을 해제해주세요/,
  );
  assert.match(
    lifecycle,
    /const structuralEditBlocked = deps\.hasMatchResult \|\| deps\.hasWeighIn/,
  );
  assert.match(
    lifecycle,
    /const structuralLocked = deps\.hasMatchResult \|\| deps\.hasWeighIn/,
  );
  assert.match(lifecycle, /hasBracketAssignment: boolean/);
  assert.match(
    lifecycle,
    /신청정보가 변경되어도 현재 편성된 대진은 자동으로 변경되지 않습니다/,
  );
  assert.doesNotMatch(lifecycle, /event-division-rebuild|rebuildEventDivision/);

  assert.match(panel, /structuralBlockReason/);
  assert.match(panel, /form\.structuralEditBlocked/);

  console.log("verify:assigned-application-edit OK");
}

main();
