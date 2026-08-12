/**
 * 신청자 Excel 일괄 등록 — parser / mapping / duplicate / idempotency / batch / scope
 *
 *   npm run verify:applicant-excel-parser
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_LEGACY_HEADERS,
  APPLICANT_EXCEL_MAX_ROWS,
  APPLICANT_EXCEL_SHEET_DATA,
  APPLICANT_EXCEL_SHEET_GUIDE,
  resolveApplicantExcelHeader,
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
  parseOptionalHeightCm,
  parseOptionalWeightKg,
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

/** 신규 18컬럼 순서 */
function athleteRow(input: {
  no?: string;
  name: string;
  gender?: string;
  birth?: string;
  gym?: string;
  ageGroup?: string;
  weightClass?: string;
  weightLimit?: string;
  sport?: string;
  weight?: string;
  height?: string;
  record?: string;
  career?: string;
}): string[] {
  return [
    input.no ?? "",
    input.gym ?? "A체육관",
    input.name,
    input.gender ?? "남",
    input.birth ?? "2008-03-15",
    "",
    input.height ?? "",
    input.weight ?? "",
    input.record ?? "",
    input.career ?? "",
    input.ageGroup ?? "고등부",
    input.weightClass ?? "라이트급 -60kg",
    input.weightLimit ?? "",
    input.sport ?? "",
    "010-1234-5678",
    "",
    "",
    "",
  ];
}

/** 레거시 13컬럼 */
function legacyAthleteRow(input: {
  name: string;
  gender?: string;
  birth?: string;
  gym?: string;
  ageGroup?: string;
  weightClass?: string;
}): string[] {
  return [
    input.name,
    input.gender ?? "남",
    input.birth ?? "2008-03-15",
    "010-1234-5678",
    input.gym ?? "A체육관",
    input.ageGroup ?? "고등부",
    input.weightClass ?? "라이트급 -60kg",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
}

async function bufferFromRows(
  rows: string[][],
  headers: readonly string[] = APPLICANT_EXCEL_HEADERS,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  sheet.addRow([...headers]);
  for (const row of rows) sheet.addRow(row);
  return workbookToBuffer(wb);
}

async function previewFromRows(
  rows: string[][],
  existing: Parameters<typeof analyzeApplicantExcelRows>[0]["existing"] = [],
  headers: readonly string[] = APPLICANT_EXCEL_HEADERS,
) {
  const buffer = await bufferFromRows(rows, headers);
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
  assert.equal(APPLICANT_EXCEL_HEADERS[0], "번호");
  assert.equal(APPLICANT_EXCEL_HEADERS[1], "체육관명");
  assert.equal(APPLICANT_EXCEL_HEADERS[2], "선수명");
  assert.ok(APPLICANT_EXCEL_HEADERS.includes("전적"));
  assert.ok(APPLICANT_EXCEL_HEADERS.includes("운동경력"));
  assert.ok(!APPLICANT_EXCEL_HEADERS.includes("승인"));

  const sample = await buildApplicantExcelSampleWorkbook({
    eventTitle: "테스트 대회",
    divisions: DIVISIONS,
  });
  assert.ok(sample.getWorksheet(APPLICANT_EXCEL_SHEET_DATA));
  assert.ok(sample.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE));
  const dataSheet = sample.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
  assert.equal(String(dataSheet.getRow(1).getCell(1).value), "번호");
  assert.equal(
    String(dataSheet.getRow(2).getCell(1).value),
    APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
  );
  assert.equal(String(dataSheet.getRow(1).getCell(3).value), "선수명");

  const buf = await workbookToBuffer(sample);
  const parsedSample = await parseApplicantExcelWorkbook(buf);
  assert.equal(parsedSample.rows.length, 0, "example row must be skipped");
  assert.equal(parsedSample.skippedExampleRows, 1);

  // sample + 3 actual rows
  dataSheet.addRow(
    athleteRow({ name: "실제01", weightClass: "라이트급 -60kg" }),
  );
  dataSheet.addRow(
    athleteRow({
      name: "실제02",
      weightClass: "라이트웰터급 -63.5kg",
    }),
  );
  dataSheet.addRow(
    athleteRow({
      name: "실제03",
      ageGroup: "대학·일반부",
      weightClass: "슈퍼헤비급 +91kg",
    }),
  );
  const withActual = await workbookToBuffer(sample);
  const parsedActual = await parseApplicantExcelWorkbook(withActual);
  assert.equal(parsedActual.rows.length, 3);
  assert.equal(parsedActual.skippedExampleRows, 1);
  const preview3 = analyzeApplicantExcelRows({
    fileName: "sample-plus.xlsx",
    headerRow: parsedActual.headerRow,
    rows: parsedActual.rows,
    divisions: DIVISIONS,
    existing: [],
  });
  assert.equal(preview3.counts.create, 3);
  assert.equal(preview3.counts.error, 0);
  assert.ok(preview3.rows.every((r) => r.fighterName.startsWith("실제")));

  const one = await previewFromRows([athleteRow({ name: "김하나" })]);
  assert.equal(one.totalRows, 1);
  assert.equal(one.counts.create, 1);

  const ten = await previewFromRows(
    Array.from({ length: 10 }, (_, i) =>
      athleteRow({ name: `선수${String(i + 1).padStart(2, "0")}` }),
    ),
  );
  assert.equal(ten.counts.create, 10);

  const hundred = await previewFromRows(
    Array.from({ length: 100 }, (_, i) =>
      athleteRow({ name: `선수${String(i + 1).padStart(3, "0")}` }),
    ),
  );
  assert.equal(hundred.counts.create, 100);

  const over = Array.from({ length: APPLICANT_EXCEL_MAX_ROWS + 1 }, (_, i) =>
    athleteRow({ name: `초과${i + 1}` }),
  );
  await assert.rejects(() => bufferFromRows(over).then(parseApplicantExcelWorkbook));
  console.log("verify:applicant-excel-parser OK");
}

function verifyMapping() {
  assert.equal(parseApplicantGender("남성").ok, true);
  assert.equal(parseApplicantGender("여").ok, true);
  assert.equal(parseApplicantGender("").ok, false);
  assert.equal(parseApplicantBirthDate("2008.03.15"), "2008-03-15");
  assert.equal(parseApplicantBirthDate("20080315"), "2008-03-15");
  assert.equal(parseOptionalWeightKg("62.8kg").kg, 62.8);
  assert.equal(parseOptionalHeightCm("175cm").cm, 175);
  assert.equal(parseOptionalHeightCm("180").cm, 180);

  assert.equal(resolveApplicantExcelHeader("이름"), "선수명");
  assert.equal(resolveApplicantExcelHeader("무게"), "체중");
  assert.equal(resolveApplicantExcelHeader("비고"), "메모");
  assert.equal(resolveApplicantExcelHeader("소속"), "체육관명");

  assert.equal(splitWeightClassInput("-63.5kg").limitText, "-63.5kg");
  assert.equal(splitWeightClassInput("63.5").limitText, null);

  assertMatch("라이트급 -60kg", "고등부", "div-light");
  assertMatch("-63.5kg", "고등부", "div-light-welter");
  assertMatch("+91kg", "대학·일반부", "div-super-heavy");

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
  assert.match(dialog, /FileDropzone/);
  assert.match(dialog, /2행 예시/);
  assert.match(dialog, /counts\.error === 0/);
  assert.doesNotMatch(dialog, /window\.alert/);

  const dropzone = read("src/components/shared/FileDropzone.tsx");
  assert.match(dropzone, /onDrop/);
  assert.match(dropzone, /파일 선택/);

  assert.equal(sanitizePlainCell("=CMD()"), "'=CMD()");
  console.log("verify:applicant-excel-scope OK");
}

async function verifySampleExampleRow() {
  const sample = await buildApplicantExcelSampleWorkbook({
    eventTitle: "QA",
    divisions: DIVISIONS,
  });
  const data = sample.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
  // 사용자가 예시를 삭제하고 2행부터 실제 입력
  data.spliceRows(2, 1);
  data.spliceRows(2, 0, athleteRow({ name: "삭제후실제1", no: "1" }));
  data.addRow(athleteRow({ name: "삭제후실제2", no: "2" }));
  const parsed = await parseApplicantExcelWorkbook(await workbookToBuffer(sample));
  assert.equal(parsed.skippedExampleRows, 0);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0]?.values.선수명, "삭제후실제1");
  console.log("verify:applicant-excel-sample-example-row OK");
}

async function verifyLegacyColumns() {
  const preview = await previewFromRows(
    [legacyAthleteRow({ name: "레거시선수" })],
    [],
    APPLICANT_EXCEL_LEGACY_HEADERS,
  );
  assert.equal(preview.counts.create, 1);
  assert.equal(preview.rows[0]?.fighterName, "레거시선수");
  console.log("verify:applicant-excel-legacy-columns OK");
}

async function verifyHeaderAliases() {
  const headers = [
    "번호",
    "체육관명",
    "이름",
    "성별",
    "생년월일",
    "나이",
    "키",
    "무게",
    "전적",
    "운동경력",
    "경기구분",
    "체급",
    "체중기준",
    "종목",
    "연락처",
    "보호자이름",
    "보호자연락처",
    "비고",
  ];
  const row = [
    "1",
    "이천 무아이핏짐",
    "김동국",
    "남",
    "2008-05-12",
    "17",
    "180cm",
    "77kg",
    "무전",
    "킥복싱 1년",
    "고등부",
    "라이트급 -60kg",
    "",
    "킥복싱",
    "010-1111-2222",
    "",
    "",
    "비고메모",
  ];
  const preview = await previewFromRows([row], [], headers);
  assert.equal(preview.counts.create, 1);
  const r = preview.rows[0]!;
  assert.equal(r.fighterName, "김동국");
  assert.equal(r.weightKg, 77);
  assert.equal(r.heightCm, 180);
  assert.equal(r.memo, "비고메모");
  assert.equal(r.recordText, "무전");

  // 운영 파일처럼 경기구분/체급 누락 → 오류
  const opsOnly = [
    "번호",
    "체육관명",
    "이름",
    "성별",
    "생년월일",
    "나이",
    "키",
    "무게",
    "전적",
    "운동경력",
    "비고",
  ];
  await assert.rejects(() =>
    bufferFromRows(
      [
        [
          "1",
          "팀라펠 짐",
          "백지후",
          "남",
          "20100708",
          "고1",
          "",
          "67.3",
          "무전",
          "",
          "",
        ],
      ],
      opsOnly,
    ).then(parseApplicantExcelWorkbook),
  );
  console.log("verify:applicant-excel-header-aliases OK");
}

async function main() {
  await verifyParser();
  verifyMapping();
  await verifyDuplicate();
  await verifyIdempotency();
  await verifyBatch();
  verifyScope();
  await verifySampleExampleRow();
  await verifyLegacyColumns();
  await verifyHeaderAliases();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
