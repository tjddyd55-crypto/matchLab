/**
 * 신청자 Excel 일괄 등록 — parser / mapping / duplicate / idempotency / batch / scope
 *
 *   npm run verify:applicant-excel-parser
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_MAX_ROWS,
  APPLICANT_EXCEL_SHEET_DATA,
  APPLICANT_EXCEL_SHEET_GUIDE,
} from "../src/lib/applicant-excel/columns";
import {
  analyzeApplicantExcelRows,
  applicantIdentityKey,
  assertPreviewReadyToCommit,
} from "../src/lib/applicant-excel/analyze";
import { matchEventDivision } from "../src/lib/applicant-excel/match-division";
import type { ApplicantDivisionCandidate } from "../src/lib/applicant-excel/match-division";
import {
  parseApplicantBirthDate,
  parseApplicantGender,
  sanitizePlainCell,
  splitWeightClassInput,
} from "../src/lib/applicant-excel/normalize";
import { parseApplicantExcelWorkbook } from "../src/lib/applicant-excel/parse";
import {
  buildApplicantExcelSampleWorkbook,
  workbookToBuffer,
} from "../src/lib/applicant-excel/sample";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

function division(input: {
  id: string;
  ageGroup: string;
  gender: string;
  weightClassName: string;
  weightLimitText: string;
  sportType?: string;
}): ApplicantDivisionCandidate {
  return {
    id: input.id,
    sportType: input.sportType ?? "킥복싱",
    ruleType: null,
    gender: input.gender,
    ageGroup: input.ageGroup,
    weightClass: `${input.weightClassName} ${input.weightLimitText}`,
    weightClassName: input.weightClassName,
    weightLimitText: input.weightLimitText,
    skillLevel: null,
  };
}

const DIVISIONS: ApplicantDivisionCandidate[] = [
  division({
    id: "div-light",
    ageGroup: "고등부",
    gender: "male",
    weightClassName: "라이트급",
    weightLimitText: "-60kg",
  }),
  division({
    id: "div-light-welter",
    ageGroup: "고등부",
    gender: "male",
    weightClassName: "라이트웰터급",
    weightLimitText: "-63.5kg",
  }),
  division({
    id: "div-super-heavy",
    ageGroup: "대학·일반부",
    gender: "male",
    weightClassName: "슈퍼헤비급",
    weightLimitText: "+91kg",
  }),
];

function athleteRow(input: {
  name: string;
  gender?: string;
  birth?: string;
  gym?: string;
  ageGroup?: string;
  weightClass?: string;
  weightLimit?: string;
  sport?: string;
  weight?: string;
}): string[] {
  return [
    input.name,
    input.gender ?? "남",
    input.birth ?? "2008-03-15",
    "010-1234-5678",
    input.gym ?? "A체육관",
    input.ageGroup ?? "고등부",
    input.weightClass ?? "라이트급 -60kg",
    input.weightLimit ?? "",
    input.sport ?? "",
    input.weight ?? "",
    "",
    "",
    "",
  ];
}

async function bufferFromRows(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  sheet.addRow([...APPLICANT_EXCEL_HEADERS]);
  for (const row of rows) sheet.addRow(row);
  return workbookToBuffer(wb);
}

async function previewFromRows(
  rows: string[][],
  existing: Parameters<typeof analyzeApplicantExcelRows>[0]["existing"] = [],
) {
  const buffer = await bufferFromRows(rows);
  const parsed = await parseApplicantExcelWorkbook(buffer);
  return analyzeApplicantExcelRows({
    fileName: "test.xlsx",
    headerRow: parsed.headerRow,
    rows: parsed.rows,
    divisions: DIVISIONS,
    existing,
  });
}

function assertMatch(weightClass: string, ageGroup: string, expectedId: string) {
  const gender = parseApplicantGender("남");
  assert.equal(gender.ok, true);
  if (!gender.ok) return;
  const matched = matchEventDivision({
    gender: gender.gender,
    row: {
      gender: "남",
      ageGroup,
      weightClass,
      weightLimit: "",
      sport: "",
    },
    divisions: DIVISIONS,
  });
  assert.equal(matched.ok, true, `${weightClass} / ${ageGroup}`);
  if (matched.ok) assert.equal(matched.division.id, expectedId);
}

async function verifyParser() {
  assert.equal(APPLICANT_EXCEL_HEADERS[0], "선수명");
  assert.ok(APPLICANT_EXCEL_HEADERS.includes("체육관명"));
  assert.ok(APPLICANT_EXCEL_HEADERS.includes("경기구분"));
  assert.ok(!APPLICANT_EXCEL_HEADERS.includes("승인"));
  assert.ok(!APPLICANT_EXCEL_HEADERS.includes("입금"));

  const sample = await buildApplicantExcelSampleWorkbook({
    eventTitle: "테스트 대회",
    divisions: DIVISIONS,
  });
  assert.ok(sample.getWorksheet(APPLICANT_EXCEL_SHEET_DATA));
  assert.ok(sample.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE));
  const buf = await workbookToBuffer(sample);
  const parsed = await parseApplicantExcelWorkbook(buf);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.values.선수명, "홍길동");
  const samplePreview = analyzeApplicantExcelRows({
    fileName: "sample.xlsx",
    headerRow: parsed.headerRow,
    rows: parsed.rows,
    divisions: DIVISIONS,
    existing: [],
  });
  assert.equal(samplePreview.counts.create, 1);
  assert.equal(samplePreview.counts.error, 0);

  const one = await previewFromRows([athleteRow({ name: "김하나" })]);
  assert.equal(one.totalRows, 1);
  assert.equal(one.counts.create, 1);

  const ten = await previewFromRows(
    Array.from({ length: 10 }, (_, i) =>
      athleteRow({ name: `선수${String(i + 1).padStart(2, "0")}` }),
    ),
  );
  assert.equal(ten.counts.create, 10);

  const fifty = await previewFromRows(
    Array.from({ length: 50 }, (_, i) =>
      athleteRow({ name: `선수${String(i + 1).padStart(2, "0")}` }),
    ),
  );
  assert.equal(fifty.counts.create, 50);

  const hundred = await previewFromRows(
    Array.from({ length: 100 }, (_, i) =>
      athleteRow({ name: `선수${String(i + 1).padStart(3, "0")}` }),
    ),
  );
  assert.equal(hundred.counts.create, 100);
  assert.equal(hundred.counts.error, 0);

  const over = Array.from({ length: APPLICANT_EXCEL_MAX_ROWS + 1 }, (_, i) =>
    athleteRow({ name: `초과${i + 1}` }),
  );
  await assert.rejects(() => bufferFromRows(over).then(parseApplicantExcelWorkbook));
  console.log("verify:applicant-excel-parser OK");
}

function verifyMapping() {
  assert.equal(parseApplicantGender("남성").ok && parseApplicantGender("남성").ok, true);
  assert.equal(parseApplicantGender("여").ok, true);
  assert.equal(parseApplicantGender("").ok, false);
  assert.equal(parseApplicantBirthDate("2008.03.15"), "2008-03-15");
  assert.equal(parseApplicantBirthDate("20080315"), "2008-03-15");

  assert.equal(splitWeightClassInput("-63.5kg").limitText, "-63.5kg");
  assert.equal(splitWeightClassInput("-63.5kg").name, "");
  assert.equal(splitWeightClassInput("+91kg").limitText, "+91kg");
  assert.equal(splitWeightClassInput("63.5").limitText, null);
  assert.equal(splitWeightClassInput("라이트급 · -60kg").name, "라이트급");
  assert.equal(splitWeightClassInput("라이트급 · -60kg").limitText, "-60kg");

  assertMatch("라이트급 -60kg", "고등부", "div-light");
  assertMatch("라이트급 · -60kg", "고등부", "div-light");
  assertMatch("-63.5kg", "고등부", "div-light-welter");
  assertMatch("라이트웰터급 -63.5kg", "고등부", "div-light-welter");
  assertMatch("+91kg", "대학·일반부", "div-super-heavy");
  assertMatch("슈퍼헤비급 +91kg", "대학·일반부", "div-super-heavy");

  const unknown = matchEventDivision({
    gender: "male",
    row: {
      gender: "남",
      ageGroup: "고등부",
      weightClass: "63.5",
      weightLimit: "",
      sport: "",
    },
    divisions: DIVISIONS,
  });
  assert.equal(unknown.ok, false);

  const missing = matchEventDivision({
    gender: "male",
    row: {
      gender: "남",
      ageGroup: "초등부",
      weightClass: "라이트급 -60kg",
      weightLimit: "",
      sport: "",
    },
    divisions: DIVISIONS,
  });
  assert.equal(missing.ok, false);
  console.log("verify:applicant-excel-mapping OK");
}

async function verifyDuplicate() {
  const preview = await previewFromRows([
    athleteRow({ name: "중복선수", gym: "A체육관" }),
    athleteRow({ name: "중복선수", gym: "A체육관" }),
  ]);
  assert.equal(preview.counts.error, 1);
  assert.equal(preview.counts.create, 1);
  assert.ok(preview.rows[1]?.errors.some((e) => e.includes("파일 내 중복")));
  assert.throws(() => assertPreviewReadyToCommit(preview));
  console.log("verify:applicant-excel-duplicate OK");
}

async function verifyIdempotency() {
  const row = athleteRow({ name: "기존선수", gym: "B체육관" });
  const first = await previewFromRows([row]);
  assert.equal(first.counts.create, 1);
  const created = first.rows[0]!;
  const retry = await previewFromRows([row], [
    {
      applicationId: "app-1",
      divisionId: created.divisionId!,
      fighterName: created.fighterName,
      birthDateIso: created.birthDate,
      gender: created.gender!,
      gymName: created.gymName,
    },
  ]);
  assert.equal(retry.counts.create, 0);
  assert.equal(retry.counts.skipExisting, 1);
  assert.equal(retry.counts.error, 0);
  assertPreviewReadyToCommit(retry);

  const key = applicantIdentityKey({
    fighterName: created.fighterName,
    birthDateIso: created.birthDate,
    gender: created.gender!,
    gymName: created.gymName,
    divisionId: created.divisionId!,
  });
  assert.equal(retry.rows[0]?.identityKey, key);
  console.log("verify:applicant-excel-idempotency OK");
}

async function verifyBatch() {
  const invalid = await previewFromRows([
    athleteRow({ name: "정상" }),
    athleteRow({ name: "", gender: "남" }),
  ]);
  assert.ok(invalid.counts.error > 0);
  assert.throws(() => assertPreviewReadyToCommit(invalid));

  const valid = await previewFromRows([
    athleteRow({ name: "A", gym: "A체육관" }),
    athleteRow({ name: "B", gym: "B체육관" }),
  ]);
  assert.equal(valid.counts.create, 2);
  assert.equal(valid.gymCounts["A체육관"], 1);
  assert.equal(valid.gymCounts["B체육관"], 1);
  assertPreviewReadyToCommit(valid);

  const svc = read("src/lib/services/application.service.ts");
  assert.match(svc, /commitOrganizerApplicantExcel/);
  assert.match(svc, /createGymEventApplication/);
  assert.match(svc, /timeout:\s*120_000/);
  assert.match(svc, /assertPreviewReadyToCommit/);
  assert.match(svc, /ApplicationStatus\.approved/);
  assert.match(svc, /PaymentStatus\.unpaid/);
  console.log("verify:applicant-excel-batch OK");
}

function verifyScope() {
  const svc = read("src/lib/services/application.service.ts");
  assert.match(svc, /requireOrganizerForEvent\(actor, input\.eventId\)/);
  const commitFn = svc.slice(svc.indexOf("commitOrganizerApplicantExcel"));
  assert.match(commitFn, /ensureOrganizerExternalRegistrationGym/);
  assert.match(commitFn, /importChannel:\s*"excel"/);
  assert.doesNotMatch(commitFn, /findOrCreateGymForOrganizerManualEntry/);
  assert.doesNotMatch(commitFn, /eventDivision\.create/);

  const schema = read("prisma/schema.prisma");
  assert.doesNotMatch(schema, /ApplicantExcel/);
  assert.doesNotMatch(schema, /EventApplicationImportBatch/);

  const board = read(
    "src/components/domain/applications/OrganizerApplicationsBoard.tsx",
  );
  assert.match(board, /OrganizerApplicantExcelTrigger/);
  assert.match(board, /OrganizerManualApplicationTrigger/);
  assert.match(board, /ExternalRegistrationLinkTrigger/);

  const dialog = read(
    "src/components/domain/applications/OrganizerApplicantExcelImportDialog.tsx",
  );
  assert.match(dialog, /엑셀 일괄 등록/);
  assert.match(dialog, /샘플 엑셀 다운로드/);
  assert.match(dialog, /counts\.error === 0/);
  assert.doesNotMatch(dialog, /window\.alert/);

  assert.equal(sanitizePlainCell("=CMD()"), "'=CMD()");
  console.log("verify:applicant-excel-scope OK");
}

async function main() {
  await verifyParser();
  verifyMapping();
  await verifyDuplicate();
  await verifyIdempotency();
  await verifyBatch();
  verifyScope();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
