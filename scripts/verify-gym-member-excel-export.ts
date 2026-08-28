/**
 * 체육관 회원 선택형 Excel export SSOT
 *   npm run verify:gym-member-excel-export
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import {
  GYM_MEMBER_EXCEL_EXPORT_FIELDS,
  defaultGymMemberExcelExportFieldKeys,
  resolveGymMemberExcelExportFields,
} from "../src/lib/gym-member/gym-member-excel-export-fields";
import type { GymMemberListItemVM } from "../src/lib/services/gym-member.service";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function sampleRow(): GymMemberListItemVM {
  return {
    id: "m1",
    memberNumber: "M001",
    name: "홍길동",
    phone: "01012345678",
    profileImageUrl: null,
    status: "active",
    membershipStatus: "active",
    membershipStatusLabel: "이용 중",
    planName: "3개월 이용권",
    startedAt: new Date(Date.UTC(2026, 0, 1)),
    endsAt: new Date(Date.UTC(2026, 3, 1)),
    expirationDisplay: "",
    periodRemainingLabel: "잔여 30일",
    attendanceCount: 5,
    paymentAmount: 300000,
    isFighter: false,
    fighterId: null,
    rowNumber: 1,
    groupNames: ["주니어"],
    rankName: null,
  };
}

async function main() {
  const labels = GYM_MEMBER_EXCEL_EXPORT_FIELDS.map((f) => f.label);
  assert.deepEqual(labels.slice(1, 6), [
    "회원명",
    "연락처",
    "그룹",
    "상태",
    "회원권",
  ]);

  const defaults = defaultGymMemberExcelExportFieldKeys();
  assert.ok(defaults.includes("name"));
  assert.ok(defaults.includes("phone"));
  assert.ok(!defaults.includes("rowNumber"));

  const row = sampleRow();
  const phoneField = GYM_MEMBER_EXCEL_EXPORT_FIELDS.find((f) => f.key === "phone")!;
  assert.match(phoneField.extract(row, 1), /^010-/);
  assert.equal(
    GYM_MEMBER_EXCEL_EXPORT_FIELDS.find((f) => f.key === "planName")!.extract(
      row,
      1,
    ),
    "3개월 이용권",
  );

  const fields = resolveGymMemberExcelExportFields(["name", "phone", "status"]);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("회원목록");
  sheet.addRow(fields.map((f) => f.label));
  sheet.addRow(fields.map((f) => f.extract(row, 1)));
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf as never);
  const s2 = wb2.getWorksheet("회원목록")!;
  assert.deepEqual((s2.getRow(1).values as unknown[]).slice(1), [
    "회원명",
    "연락처",
    "상태",
  ]);

  const service = read("src/lib/services/gym-member-excel.service.ts");
  assert.match(service, /buildExcelWorkbook/);
  assert.match(service, /requireGymPortalRead/);
  assert.match(service, /listMembersForExport/);

  const btn = read("src/components/domain/gym-members/MemberExcelDownloadButton.tsx");
  assert.match(btn, /SelectableExcelExportDialog/);
  assert.doesNotMatch(btn, /\balert\(/);

  const dialog = read("src/components/shared/excel-export/SelectableExcelExportDialog.tsx");
  assert.match(dialog, /전체 선택/);

  console.log("verify:gym-member-excel-export OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
