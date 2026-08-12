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
  나이: 9,
  키: 10,
  체중: 10,
  전적: 20,
  운동경력: 24,
  경기구분: 16,
  체급: 25,
  체중기준: 14,
  종목: 14,
  연락처: 18,
  보호자이름: 14,
  보호자연락처: 18,
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

export async function buildApplicantExcelSampleWorkbook(input: {
  eventTitle: string;
  divisions: ApplicantExcelSampleDivision[];
}): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  const primary = input.divisions[0];
  const secondary =
    input.divisions.find((d) => d.id !== primary?.id) ?? primary ?? null;

  const headerRow = data.getRow(1);
  APPLICANT_EXCEL_HEADERS.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    if (isRequiredHeader(header)) {
      cell.note = "필수 컬럼";
    }
  });
  // 숨김 식별 컬럼
  headerRow.getCell(APPLICANT_EXCEL_HEADERS.length + 1).value =
    APPLICANT_EXCEL_INTERNAL_KIND_HEADER;
  applyHeaderStyle(headerRow);
  headerRow.getCell(1).note =
    "※ 2행은 입력 예시입니다. 실제 등록 대상에 포함되지 않습니다. 3행부터 실제 선수를 입력하세요.";

  const exampleAge = primary?.ageGroup?.trim() || "고등부";
  const exampleWeight = weightChip(primary ?? ({} as ApplicantExcelSampleDivision));
  const exampleLimit =
    weightLimit(primary ?? ({} as ApplicantExcelSampleDivision)) || "-63.5kg";
  const exampleSport = formatDivisionSportTitle(primary ?? {}) || "킥복싱";

  const exampleRow = data.getRow(2);
  const exampleValues: string[] = [
    APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
    "마포킥복싱",
    "홍길동",
    "남",
    "2008-05-12",
    "18",
    "175",
    "62.8",
    "3전 2승 1패",
    "킥복싱 2년",
    exampleAge,
    exampleWeight || "라이트급 -60kg",
    exampleLimit,
    exampleSport,
    "010-1234-5678",
    "김보호",
    "010-1111-2222",
    "첫 출전",
  ];
  exampleValues.forEach((value, idx) => {
    const cell = exampleRow.getCell(idx + 1);
    cell.value = value;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
    cell.font = { italic: true, color: { argb: "FF64748B" } };
  });
  exampleRow.getCell(APPLICANT_EXCEL_HEADERS.length + 1).value =
    APPLICANT_EXCEL_EXAMPLE_KIND;

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
  guide.addRow(["대회", sanitizePlainCell(input.eventTitle)]);
  guide.addRow([
    "작성 방법",
    "1행=헤더, 2행=예시(등록 안 됨), 3행부터 실제 선수 입력",
  ]);
  guide.addRow([]);
  const ruleHeader = guide.addRow(["항목", "필수", "입력 방법", "예시"]);
  applyHeaderStyle(ruleHeader);

  const limitAlt =
    weightLimit(secondary ?? ({} as ApplicantExcelSampleDivision)) || "+91kg";
  const guideRows: Array<[string, string, string, string]> = [
    ["번호", "선택", "순번. 예시는 「예시」", "1"],
    ["체육관명", "필수", "소속 체육관 표시명", "마포킥복싱"],
    ["선수명", "필수", "실제 선수명", "홍길동"],
    ["성별", "필수", "권장 남/여 (남성·여성·male·female 허용)", "남"],
    ["생년월일", "필수", "YYYY-MM-DD 권장. Excel 날짜·YYYYMMDD도 인식", "2008-05-12"],
    ["나이", "선택", "참고값. 생년월일이 있으면 생년월일 우선", "18"],
    ["키", "선택", "숫자(cm). 175 또는 175cm", "175"],
    ["체중", "선택", "숫자만 권장. 62.8 / 62.8kg 허용", "62.8"],
    ["전적", "선택", "자유 문장 그대로 보존", "3전 2승 1패"],
    ["운동경력", "선택", "자유 문장 그대로 보존", "킥복싱 2년"],
    ["경기구분", "필수", "아래 목록과 동일", exampleAge],
    ["체급", "필수", "아래 목록과 동일 (체급명+기준 권장)", exampleWeight || exampleLimit],
    [
      "체중기준",
      "선택",
      `체급 기준. 예) ${exampleLimit}, ${limitAlt}. 숫자만(63.5) 금지`,
      exampleLimit,
    ],
    ["종목", "선택", "대회 종목명", exampleSport],
    ["연락처", "선택", "문자(텍스트) 형식", "010-1234-5678"],
    ["보호자이름", "선택", "필요 시", "김보호"],
    ["보호자연락처", "선택", "문자(텍스트) 형식", "010-1111-2222"],
    ["메모", "선택", "운영 참고 / 비고", "첫 출전"],
  ];
  for (const row of guideRows) {
    guide.addRow(row.map((c) => sanitizePlainCell(c)));
  }

  guide.addRow([]);
  guide.addRow([
    "체중기준 vs 체중",
    "체중기준=신청 체급 기준(-63.5kg). 체중=선수 실측(62.8).",
  ]);
  guide.addRow([]);
  guide.addRow(["현재 대회 사용 가능 값"]);
  const lookupHeader = guide.addRow([
    "경기구분",
    "성별",
    "체급",
    "체중기준",
    "종목",
  ]);
  applyHeaderStyle(lookupHeader);
  for (const d of input.divisions) {
    guide.addRow([
      sanitizePlainCell(d.ageGroup ?? "-"),
      sanitizePlainCell(formatDivisionGenderLabel(d.gender) ?? "-"),
      sanitizePlainCell(weightChip(d) || "-"),
      sanitizePlainCell(weightLimit(d) || "-"),
      sanitizePlainCell(formatDivisionSportTitle(d) ?? "-"),
    ]);
  }
  guide.columns = [
    { width: 14 },
    { width: 10 },
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
