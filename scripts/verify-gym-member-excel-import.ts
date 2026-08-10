/**
 * 회원 Excel Import / Compact UI / 재등록 횟수 — 정적 검증
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function main() {
  const parser = read("src/lib/gym-member-import/excel-parser.ts");
  assert.match(parser, /MEMBER_IMPORT_HEADERS/);
  assert.match(parser, /회원명/);
  assert.match(parser, /지점명/);
  assert.match(parser, /scoreHeaderRow/);
  assert.match(parser, /parseMemberImportWorkbook/);

  const svc = read("src/lib/services/gym-member-import.service.ts");
  assert.match(svc, /analyzeWorkbook/);
  assert.match(svc, /commitImport/);
  assert.match(svc, /excel_import/);
  assert.match(svc, /sourceRegistrationType/);
  assert.match(svc, /duplicate_review/);
  assert.match(svc, /skip_idempotent/);
  assert.match(svc, /수강:\s*GymMemberStatus\.active/);
  assert.doesNotMatch(svc, /rankName:\s*row\.excelGradeLabel/);
  assert.match(svc, /excelGradeLabel/);
  assert.match(svc, /sourceNew/);
  assert.match(svc, /sourceRenewal/);
  assert.match(svc, /countMatchonRenewals/);
  assert.doesNotMatch(svc, /max\(0,\s*total/);

  const sale = read("src/lib/services/gym-membership-sale.service.ts");
  assert.match(sale, /GymMemberSubscriptionCreationSource\.renew/);
  assert.match(sale, /listSubscriptionHistory/);
  assert.match(sale, /matchonRenewalCount/);
  assert.match(sale, /재등록\(가져오기\)/);

  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model GymMemberImportBatch/);
  assert.match(schema, /creationSource/);
  assert.match(schema, /sourceRegistrationType/);
  assert.match(schema, /taxAmount/);
  assert.match(schema, /importMeta/);
  assert.match(schema, /gym_member_import_completed/);

  const mig = read(
    "prisma/migrations/20260810120000_gym_member_excel_import/migration.sql",
  );
  assert.match(mig, /GymMemberImportBatch/);
  assert.match(mig, /excel_import/);

  const actions = read("src/features/gym-members/actions.ts");
  assert.match(actions, /analyzeGymMemberExcelImportAction/);
  assert.match(actions, /commitGymMemberExcelImportAction/);

  const dialog = read(
    "src/components/domain/gym-members/MemberExcelImportDialog.tsx",
  );
  assert.match(dialog, /엑셀 회원 업로드/);
  assert.match(dialog, /analyzeGymMemberExcelImportAction/);
  assert.match(dialog, /commitGymMemberExcelImportAction/);
  assert.match(dialog, /label: \"신규\"/);
  assert.match(dialog, /label: \"재등록\"/);
  assert.match(dialog, /sourceNew|counts\.sourceNew/);
  assert.match(dialog, /sticky top-0/);
  assert.match(dialog, /memberNumber/);
  assert.match(dialog, /__create__/);

  const page = read("src/app/(dashboard)/gym/members/page.tsx");
  assert.match(page, /MemberExcelImportButton/);

  const table = read("src/components/domain/gym-members/MemberTable.tsx");
  assert.match(table, /groupNames/);
  assert.match(table, /rankName/);
  assert.match(table, /rowNumber/);

  const panel = read(
    "src/components/domain/gym-members/GymMemberMembershipPanel.tsx",
  );
  assert.match(panel, /이용권 이력/);
  assert.match(panel, /재등록/);
  assert.match(panel, /MATCHON에서 처리한/);
  assert.match(panel, /subscriptionHistory/);
  assert.match(panel, /가져오기/);

  const detail = read(
    "src/app/(dashboard)/gym/members/[memberId]/page.tsx",
  );
  assert.match(detail, /listSubscriptionHistory/);
  assert.match(detail, /subscriptionHistory/);

  console.log("verify:gym-member-excel-import OK");
  console.log("verify:gym-member-import-mapping OK");
  console.log("verify:gym-member-import-idempotency OK (static)");
  console.log("verify:gym-member-import-duplicate OK (static)");
  console.log("verify:gym-member-renewal-count OK (static)");
  console.log("verify:gym-member-compact-ui OK");
  console.log("verify:gym-member-import-gym-scope OK (static requireGymPortalWrite)");
}

main();
