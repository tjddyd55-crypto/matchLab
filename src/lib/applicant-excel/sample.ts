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
  신청체중: 12,
  전적: 20,
  총전: 8,
  승: 7,
  무: 7,
  패: 7,
  운동경력: 24,
  주민등록번호: 18,
  "보험가입 개인정보동의": 22,
  경기구분: 16,
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
    "※ 2행은 입력 예시입니다. 실제 등록 대상에 포함되지 않습니다. 3행부터 실제 선수를 입력하세요.";

  const exampleAge = primary?.ageGroup?.trim() || "성인";
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
    "62.5",
    "3전 2승 1패",
    "3",
    "2",
    "0",
    "1",
    "킥복싱 2년",
    "000000-0000001",
    "동의",
    exampleAge === "대학·일반부" ? "성인" : exampleAge,
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
  setTextColumn(data, "주민등록번호");

  const guide = wb.addWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
  guide.addRow(["대회", sanitizePlainCell(input.eventTitle)]);
  guide.addRow([
    "작성 방법",
    "1행=헤더, 2행=예시(등록 안 됨), 3행부터 실제 선수 입력",
  ]);
  guide.addRow([
    "체급 입력",
    "체급명과 체중기준은 입력하지 않습니다. 신청체중을 입력하면 대회 체급표 기준으로 자동 배정됩니다.",
  ]);
  guide.addRow([
    "경기구분 예",
    "초3, 중2, 고1, 성인, 초등부, 일반부. 정확한 매칭이 안 되면 확인 필요 처리됩니다.",
  ]);
  guide.addRow([]);
  const ruleHeader = guide.addRow(["항목", "필수", "입력 방법", "예시"]);
  applyHeaderStyle(ruleHeader);

  const guideRows: Array<[string, string, string, string]> = [
    ["번호", "선택", "순번. 예시는 「예시」", "1"],
    ["체육관명", "필수", "소속 체육관 표시명", "마포킥복싱"],
    ["선수명", "필수", "실제 선수명", "홍길동"],
    ["성별", "필수", "권장 남/여 (남성·여성·male·female 허용)", "남"],
    ["생년월일", "필수", "YYYY-MM-DD 권장. Excel 날짜·YYYYMMDD도 인식", "2008-05-12"],
    ["나이", "선택", "참고값. 생년월일이 있으면 생년월일 우선", "18"],
    ["키", "선택", "숫자(cm). 175 또는 175cm", "175"],
    ["신청체중", "필수", "이번 대회 출전 신청 체중. 62.5 / 62.5kg", "62.5"],
    ["전적", "선택", "표시용. 총전/승/무/패가 있으면 그쪽이 우선", "3전 2승 1패"],
    ["총전", "선택", "정수", "3"],
    ["승", "선택", "정수", "2"],
    ["무", "선택", "정수", "0"],
    ["패", "선택", "정수", "1"],
    ["운동경력", "선택", "자유 문장 그대로 보존", "킥복싱 2년"],
    [
      "주민등록번호",
      "필수",
      "보험가입용. 000000-0000001 형식. 실제 개인번호 예시 금지",
      "000000-0000001",
    ],
    [
      "보험가입 개인정보동의",
      "필수",
      "동의를 받은 선수만 「동의」 입력",
      "동의",
    ],
    ["경기구분", "필수", "초3 / 중2 / 고1 / 성인 등", exampleAge],
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
    "보험가입 개인정보 동의",
    "보험가입 개인정보 동의를 받은 선수만 입력하세요.",
  ]);
  guide.addRow([
    "체급표 참고",
    "아래 목록은 참고용입니다. 체급명/체중기준을 직접 입력하지 마세요.",
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
      sanitizePlainCell(d.weightClassName?.trim() || weightChip(d) || "-"),
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
