/**
 * 회원 엑셀 내보내기 — exceljs / CTA / 파일명 SSOT
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(pkg.dependencies?.exceljs, "exceljs dependency required");

  const service = readFileSync(
    "src/lib/services/gym-member-excel.service.ts",
    "utf8",
  );
  assert.match(service, /exceljs/i);
  assert.match(service, /MATCHON_회원목록_/);
  assert.match(service, /requireGymPortalRead/);
  assert.match(service, /보호자\(비상연락처\)/);
  assert.match(service, /사물함 이용금액/);
  assert.match(service, /출석문자 수신/);
  assert.match(service, /numFmt = "@"/);

  const actions = readFileSync("src/features/gym-members/actions.ts", "utf8");
  assert.match(actions, /exportGymMembersExcelAction/);

  const btn = readFileSync(
    "src/components/domain/gym-members/MemberExcelDownloadButton.tsx",
    "utf8",
  );
  assert.match(btn, /엑셀 다운로드/);

  const page = readFileSync(
    "src/app/(dashboard)/gym/members/page.tsx",
    "utf8",
  );
  assert.match(page, /MemberExcelDownloadButton/);

  console.log("verify:gym-member-excel-export OK");
}

main();
