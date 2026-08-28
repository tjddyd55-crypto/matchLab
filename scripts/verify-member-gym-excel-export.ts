/**
 * 협회 회원사 선택형 Excel export SSOT
 *   npm run verify:member-gym-excel-export
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import {
  MEMBER_GYM_EXCEL_EXPORT_FIELDS,
  defaultMemberGymExcelExportFieldKeys,
  resolveMemberGymExcelExportFields,
  type MemberGymExcelExportRow,
} from "../src/lib/member-gym/member-gym-excel-export-fields";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function sampleRow(): MemberGymExcelExportRow {
  return {
    id: "mg1",
    gymName: "MATCHON 체육관",
    memberCode: "MG-001",
    accountStatusLabel: "정상 연결",
    fighterTotal: 12,
    fighterActive: 8,
    statusLabel: "정상",
    approvedAt: new Date(Date.UTC(2026, 0, 15)),
  };
}

async function main() {
  assert.equal(MEMBER_GYM_EXCEL_EXPORT_FIELDS.length, 6);
  assert.deepEqual(
    MEMBER_GYM_EXCEL_EXPORT_FIELDS.map((f) => f.label),
    [
      "회원사명",
      "회원사 코드",
      "계정",
      "선수(전체/활동)",
      "상태",
      "승인일",
    ],
  );

  const defaults = defaultMemberGymExcelExportFieldKeys();
  assert.ok(defaults.includes("gymName"));
  assert.ok(defaults.includes("status"));

  const row = sampleRow();
  const fields = resolveMemberGymExcelExportFields(["gymName", "status"]);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("회원사");
  sheet.addRow(fields.map((f) => f.label));
  sheet.addRow(fields.map((f) => f.extract(row, 1)));
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf as never);
  const s2 = wb2.getWorksheet("회원사")!;
  assert.deepEqual((s2.getRow(1).values as unknown[]).slice(1), [
    "회원사명",
    "상태",
  ]);
  assert.deepEqual((s2.getRow(2).values as unknown[]).slice(1), [
    "MATCHON 체육관",
    "정상",
  ]);

  const page = read("src/app/(dashboard)/organizer/member-gyms/page.tsx");
  assert.match(page, /MemberGymListExcelExport/);

  const service = read("src/lib/services/member-gym-excel-export.service.ts");
  assert.match(service, /requireAssociationOrganizerScope/);
  assert.doesNotMatch(service, /authUserId/);

  console.log("verify:member-gym-excel-export OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
