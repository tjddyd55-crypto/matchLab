/**
 * 신청자 선택형 Excel export SSOT
 *   npm run verify:applicant-excel-export
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  defaultApplicantExcelExportFieldKeys,
  resolveApplicantExcelExportFields,
  sanitizeApplicantExcelFilenamePart,
  type ApplicantExcelExportRow,
} from "../src/lib/applications/applicant-excel-export-fields";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "../src/lib/ui-labels/match-category";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function sampleRow(overrides: Partial<ApplicantExcelExportRow> = {}): ApplicantExcelExportRow {
  return {
    applicationId: "app1",
    gymName: "MATCHON 체육관",
    fighterName: "홍길동",
    phone: "01012345678",
    fighterGender: "male",
    birthDate: new Date(Date.UTC(2005, 0, 15)),
    division: {
      sportType: "킥복싱",
      ruleType: null,
      gender: "male",
      ageGroup: "고등부",
      weightClass: null,
      weightClassName: null,
      weightLimitText: "-70kg",
      skillLevel: null,
    },
    divisionLabel: "고등부 남성 -70kg",
    applicationWeightKg: 68.5,
    recordText: "3승 1패",
    careerText: "3년",
    paymentStatus: "paid",
    applicationStatus: "approved",
    cancellationSource: null,
    additionalInfoLabel: "완료",
    appliedAt: "2026-08-28T02:00:00.000Z",
    depositorName: "홍길동",
    memo: "테스트",
    isAssigned: true,
    ...overrides,
  };
}

async function main() {
  assert.ok(APPLICANT_EXCEL_EXPORT_FIELDS.length >= 10);
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "division")?.label,
    MATCH_CATEGORY_WITH_WEIGHT_LABEL,
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "fighterName")?.label,
    "선수명",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "gymName")?.label,
    "체육관",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "paymentStatus")?.label,
    "입금내역",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "applicationStatus")
      ?.label,
    "상태",
  );

  const defaults = defaultApplicantExcelExportFieldKeys();
  assert.ok(defaults.includes("fighterName"));
  assert.ok(defaults.includes("phone"));
  assert.ok(!defaults.includes("memo"));

  const two = resolveApplicantExcelExportFields(["fighterName", "phone"]);
  assert.deepEqual(
    two.map((f) => f.label),
    ["선수명", "연락처"],
  );

  // registry 순서 유지 (클릭 순서가 아님)
  const reordered = resolveApplicantExcelExportFields([
    "applicationStatus",
    "fighterName",
    "gymName",
  ]);
  assert.deepEqual(
    reordered.map((f) => f.key),
    ["gymName", "fighterName", "applicationStatus"],
  );

  const row = sampleRow();
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "gender")!.extract(
      row,
      1,
    ),
    "남",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "applicationStatus")!
      .extract(row, 1),
    "승인",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "paymentStatus")!
      .extract(row, 1),
    "입금완료",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "assignment")!.extract(
      row,
      1,
    ),
    "대진완료",
  );
  assert.equal(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "recordText")!.extract(
      row,
      1,
    ),
    "3승 1패",
  );
  assert.match(
    APPLICANT_EXCEL_EXPORT_FIELDS.find((f) => f.key === "birthDate")!.extract(
      row,
      1,
    ),
    /^2005\.01\.15$/,
  );

  // XLSX round-trip
  const fields = resolveApplicantExcelExportFields([
    "fighterName",
    "phone",
    "gymName",
    "recordText",
    "applicationStatus",
  ]);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("신청자");
  sheet.addRow(fields.map((f) => f.label));
  sheet.addRow(fields.map((f) => f.extract(row, 1)));
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf as never);
  const s2 = wb2.getWorksheet("신청자")!;
  const headers = (s2.getRow(1).values as unknown[]).slice(1);
  // registry(UI) 순서: 체육관 → 선수명 → 연락처 → … → 전적 → … → 상태
  assert.deepEqual(headers, [
    "체육관",
    "선수명",
    "연락처",
    "전적",
    "상태",
  ]);
  const values = (s2.getRow(2).values as unknown[]).slice(1);
  assert.deepEqual(values, [
    "MATCHON 체육관",
    "홍길동",
    "01012345678",
    "3승 1패",
    "승인",
  ]);

  assert.match(
    sanitizeApplicantExcelFilenamePart('제 12회 / "마포" 대회'),
    /^제_12회_마포_대회$/,
  );

  const board = read(
    "src/components/domain/applications/OrganizerApplicationsBoard.tsx",
  );
  assert.match(board, /OrganizerApplicantExcelExportDialog/);
  assert.match(board, /엑셀 다운로드|OrganizerApplicantExcelExportTrigger/);

  const dialog = read(
    "src/components/domain/applications/OrganizerApplicantExcelExportDialog.tsx",
  );
  assert.match(dialog, /SelectableExcelExportDialog/);
  assert.doesNotMatch(dialog, /\balert\(/);

  const actions = read("src/features/applications/actions.ts");
  assert.match(actions, /exportOrganizerApplicationsExcelAction/);

  const service = read("src/lib/services/applicant-excel-export.service.ts");
  assert.match(service, /requireOrganizerForEvent/);
  assert.match(service, /buildExcelWorkbook/);
  assert.doesNotMatch(service, /insuranceRrn/);

  console.log("verify:applicant-excel-export OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
