import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_EXAMPLE_KIND,
  APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_INTERNAL_KIND_HEADER,
  APPLICANT_EXCEL_REQUIRED_HEADERS,
  APPLICANT_EXCEL_SAMPLE_FILENAME,
  APPLICANT_EXCEL_SHEET_DATA,
  APPLICANT_EXCEL_SHEET_GUIDE,
} from "@/lib/applicant-excel/columns";
import { MINIMAL_APPLICATION_GUIDE_LINES } from "@/lib/applications/minimal-application";
import { DIVISION_SELECTION_OTHER_LABEL } from "@/lib/applications/division-selection";
import { sanitizePlainCell } from "@/lib/applicant-excel/normalize";
import {
  formatDivisionGenderLabel,
  formatDivisionSportTitle,
  formatDivisionWeightChipLabel,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";

export { APPLICANT_EXCEL_SAMPLE_FILENAME };

export type ApplicantExcelSampleDivision = EventDivisionDisplayInput & {
  id: string;
};

const COLUMN_WIDTHS: Record<string, number> = {
  번호: 8,
  체육관명: 22,
  선수명: 14,
  성별: 9,
  생년월일: 14,
  연락처: 18,
  경기구분: 16,
  체급: 16,
  총전: 8,
  승: 7,
  무: 7,
  패: 7,
  신청체중: 12,
  운동경력: 24,
  보호자이름: 14,
  보호자연락처: 18,
  기타내용: 28,
  메모: 28,
};

function isRequiredHeader(header: string): boolean {
  return (APPLICANT_EXCEL_REQUIRED_HEADERS as readonly string[]).includes(
    header,
  );
}

function weightChip(d: ApplicantExcelSampleDivision): string {
  return (
    formatDivisionWeightChipLabel(d) ??
    d.weightClass?.trim() ??
    d.weightLimitText?.trim() ??
    ""
  );
}

function weightLimit(d: ApplicantExcelSampleDivision): string {
  return d.weightLimitText?.trim() || weightChip(d);
}

function weightClassName(d: ApplicantExcelSampleDivision): string {
  return (
    d.weightClassName?.trim() ||
    weightChip(d) ||
    d.weightClass?.trim() ||
    ""
  );
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

function setTextColumn(sheet: ExcelJS.Worksheet, header: string) {
  const idx = APPLICANT_EXCEL_HEADERS.indexOf(
    header as (typeof APPLICANT_EXCEL_HEADERS)[number],
  );
  if (idx < 0) return;
  sheet.getColumn(idx + 1).numFmt = "@";
}

function paintExampleRow(row: ExcelJS.Row, values: string[]) {
  values.forEach((value, idx) => {
    const cell = row.getCell(idx + 1);
    cell.value = value;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
    cell.font = { italic: true, color: { argb: "FF64748B" } };
  });
  row.getCell(APPLICANT_EXCEL_HEADERS.length + 1).value =
    APPLICANT_EXCEL_EXAMPLE_KIND;
}

export async function buildApplicantExcelSampleWorkbook(input: {
  eventTitle: string;
  divisions: ApplicantExcelSampleDivision[];
}): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  const primary = input.divisions[0];

  const headerRow = data.getRow(1);
  APPLICANT_EXCEL_HEADERS.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    if (isRequiredHeader(header)) {
      cell.note = "필수 컬럼";
    }
  });
  headerRow.getCell(APPLICANT_EXCEL_HEADERS.length + 1).value =
    APPLICANT_EXCEL_INTERNAL_KIND_HEADER;
  applyHeaderStyle(headerRow);
  headerRow.getCell(1).note =
    "※ 2~3행은 입력 예시입니다. 실제 등록 대상에 포함되지 않습니다. 4행부터 실제 선수를 입력하세요.";

  const exampleAge = primary?.ageGroup?.trim() || "성인";
  const exampleClass = primary
    ? weightClassName(primary) || "라이트급"
    : "라이트급";

  // 등록 체급 예시
  paintExampleRow(data.getRow(2), [
    APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
    "마포킥복싱",
    "홍길동",
    "남",
    "2008-05-12",
    "010-1234-5678",
    exampleAge === "대학·일반부" ? "성인" : exampleAge,
    exampleClass,
    "3",
    "2",
    "0",
    "1",
    "62.5",
    "킥복싱 2년",
    "김보호",
    "010-1111-2222",
    "",
    "첫 출전",
  ]);

  // 기타 체급 예시
  paintExampleRow(data.getRow(3), [
    APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
    "마포킥복싱",
    "이기타",
    "여",
    "2005-11-03",
    "010-9876-5432",
    exampleAge === "대학·일반부" ? "성인" : exampleAge,
    DIVISION_SELECTION_OTHER_LABEL,
    "0",
    "0",
    "0",
    "0",
    "",
    "",
    "",
    "",
    "-52kg 체급 희망",
    "",
  ]);

  data.views = [{ state: "frozen", ySplit: 1 }];
  data.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: APPLICANT_EXCEL_HEADERS.length },
  };
  data.columns = [
    ...APPLICANT_EXCEL_HEADERS.map((h) => ({ width: COLUMN_WIDTHS[h] ?? 14 })),
    { width: 10, hidden: true },
  ];
  setTextColumn(data, "연락처");
  setTextColumn(data, "보호자연락처");
  setTextColumn(data, "생년월일");
  setTextColumn(data, "번호");

  const guide = wb.addWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
  guide.addRow(["1차 신청 안내", MINIMAL_APPLICATION_GUIDE_LINES[0]!]);
  guide.addRow(["추가정보", MINIMAL_APPLICATION_GUIDE_LINES[1]!]);
  guide.addRow([]);
  guide.addRow(["대회", sanitizePlainCell(input.eventTitle)]);
  guide.addRow([
    "작성 방법",
    "1행=헤더, 2~3행=예시(등록 안 됨), 4행부터 실제 선수 입력",
  ]);
  guide.addRow([
    "체급 입력",
    "체급표의 체급명을 입력하세요. 체급표에 없으면 「기타」 + 기타내용 필수. 신청체중은 체급 매칭에 사용하지 않습니다.",
  ]);
  guide.addRow([
    "경기구분 예",
    "초3, 중2, 고1, 성인, 초등부, 일반부. 성별+경기구분+체급이 체급표와 정확히 하나 일치해야 합니다.",
  ]);
  guide.addRow([]);
  const ruleHeader = guide.addRow(["항목", "필수", "입력 방법", "예시"]);
  applyHeaderStyle(ruleHeader);

  const guideRows: Array<[string, string, string, string]> = [
    ["번호", "선택", "순번. 예시는 「예시」", "1"],
    ["체육관명", "필수", "소속 체육관 표시명", "마포킥복싱"],
    ["선수명", "필수", "실제 선수명", "홍길동"],
    ["성별", "필수", "권장 남/여 (남성·여성·male·female 허용)", "남"],
    ["생년월일", "필수", "YYYY-MM-DD. 미성년 판정·보호자 연락처 조건에 사용", "2008-05-12"],
    ["연락처", "필수", "선수 휴대폰 (문자/텍스트)", "010-1234-5678"],
    ["경기구분", "필수", "초3 / 중2 / 고1 / 성인 등", exampleAge],
    ["체급", "필수", "체급표 체급명. 없으면 「기타」", exampleClass],
    ["총전", "필수", "정수. 무전은 0", "3"],
    ["승", "필수", "정수", "2"],
    ["무", "필수", "정수", "0"],
    ["패", "필수", "정수", "1"],
    ["신청체중", "선택", "참고용. 빈칸 가능. 체급 자동배정에 사용하지 않음", "62.5"],
    ["운동경력", "선택", "자유 문장", "킥복싱 2년"],
    ["보호자이름", "선택", "필요 시", "김보호"],
    [
      "보호자연락처",
      "조건부",
      "미성년(만 19세 미만)이면 필수",
      "010-1111-2222",
    ],
    [
      "기타내용",
      "조건부",
      "체급=기타일 때 필수. 희망 체급·요청사항",
      "-52kg 체급 희망",
    ],
    ["메모", "선택", "운영 참고", "첫 출전"],
  ];
  for (const row of guideRows) {
    guide.addRow(row.map((c) => sanitizePlainCell(c)));
  }

  guide.addRow([]);
  guide.addRow([
    "개인정보(2차)",
    "주민등록번호·개인정보 동의·서명은 추후 별도 요청합니다. Excel만으로 추가정보를 완료 처리할 수 없습니다.",
  ]);
  guide.addRow([
    "체급표 참고",
    "아래 목록의 경기구분·체급명을 그대로 입력하세요. 「기타」는 체급표에 없어도 됩니다.",
  ]);
  guide.addRow([]);
  guide.addRow(["현재 대회 체급표 (참고용)"]);
  const lookupHeader = guide.addRow([
    "경기구분",
    "성별",
    "종목",
    "체급명",
    "체중기준",
  ]);
  applyHeaderStyle(lookupHeader);
  for (const d of input.divisions) {
    guide.addRow([
      sanitizePlainCell(d.ageGroup ?? "-"),
      sanitizePlainCell(formatDivisionGenderLabel(d.gender) ?? "-"),
      sanitizePlainCell(formatDivisionSportTitle(d) ?? "-"),
      sanitizePlainCell(weightClassName(d) || "-"),
      sanitizePlainCell(weightLimit(d) || "-"),
    ]);
  }
  guide.columns = [
    { width: 22 },
    { width: 14 },
    { width: 42 },
    { width: 28 },
  ];
  guide.views = [{ state: "frozen", ySplit: 1 }];

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
