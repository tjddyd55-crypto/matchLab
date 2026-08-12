import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_HEADERS,
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

const GUIDE_TABLE_HEADERS = [
  "항목",
  "필수",
  "입력 예시",
  "입력 규칙",
] as const;

type GuideRuleRow = {
  field: string;
  required: "필수" | "선택";
  example: string;
  rule: string;
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

function buildGuideRules(
  divisions: ApplicantExcelSampleDivision[],
): GuideRuleRow[] {
  const primary = divisions[0];
  const secondary =
    divisions.find((d) => d.id !== primary?.id) ?? primary ?? null;
  const ageExample = primary?.ageGroup?.trim() || "고등부";
  const weightExample =
    weightChip(primary ?? ({} as ApplicantExcelSampleDivision)) ||
    "라이트웰터급 -63.5kg";
  const limitExample =
    weightLimit(primary ?? ({} as ApplicantExcelSampleDivision)) || "-63.5kg";
  const sportExample =
    formatDivisionSportTitle(primary ?? {}) || "킥복싱";
  const secondaryLimit =
    weightLimit(secondary ?? ({} as ApplicantExcelSampleDivision)) || "+91kg";

  return [
    {
      field: "선수명",
      required: "필수",
      example: "홍길동",
      rule: "실제 선수명",
    },
    {
      field: "성별",
      required: "필수",
      example: "남성",
      rule: "권장: 남성 / 여성 (남·여·male·female도 허용)",
    },
    {
      field: "생년월일",
      required: "필수",
      example: "2008-05-12",
      rule: "YYYY-MM-DD 권장. Excel 날짜 셀·YYYY.MM.DD·YYYYMMDD도 인식",
    },
    {
      field: "연락처",
      required: "선택",
      example: "010-1234-5678",
      rule: "문자(텍스트) 형식. 숫자 셀이면 앞자리 0이 사라질 수 있음",
    },
    {
      field: "체육관명",
      required: "필수",
      example: "마포킥복싱",
      rule: "소속 체육관 표시명",
    },
    {
      field: "경기구분",
      required: "필수",
      example: ageExample,
      rule: "아래 사용 가능 목록과 동일하게 입력",
    },
    {
      field: "체급",
      required: "필수",
      example: weightExample,
      rule: "현재 대회 체급과 동일 (체급명 + 체중표시 권장)",
    },
    {
      field: "체중기준",
      required: "선택",
      example: limitExample,
      rule: `체급 기준값. 예) ${limitExample}, ${secondaryLimit}. 숫자만(63.5) 입력 금지`,
    },
    {
      field: "종목",
      required: "선택",
      example: sportExample,
      rule: "대회 종목명. 비워도 체급 매칭 가능",
    },
    {
      field: "체중",
      required: "선택",
      example: "62.8",
      rule: "선수 실제 체중. 숫자만 입력 (kg 단위 문구 제외)",
    },
    {
      field: "보호자이름",
      required: "선택",
      example: "김보호",
      rule: "미성년 등 필요 시 입력",
    },
    {
      field: "보호자연락처",
      required: "선택",
      example: "010-1111-2222",
      rule: "문자(텍스트) 형식",
    },
    {
      field: "메모",
      required: "선택",
      example: "첫 출전",
      rule: "운영용 참고 메모",
    },
  ];
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

function setTextColumn(sheet: ExcelJS.Worksheet, col: number) {
  sheet.getColumn(col).numFmt = "@";
}

export async function buildApplicantExcelSampleWorkbook(input: {
  eventTitle: string;
  divisions: ApplicantExcelSampleDivision[];
}): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);

  data.mergeCells(1, 1, 1, APPLICANT_EXCEL_HEADERS.length);
  const note = data.getCell(1, 1);
  note.value =
    "※ 「선수 신청」시트에는 실제 선수만 입력하세요. 입력 예시·규칙은 「입력 안내」시트를 참고하세요.";
  note.font = { color: { argb: "FF64748B" }, size: 10 };
  note.alignment = { vertical: "middle", wrapText: true };
  data.getRow(1).height = 22;

  const headerRowIndex = 2;
  const headerRow = data.getRow(headerRowIndex);
  APPLICANT_EXCEL_HEADERS.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    if (isRequiredHeader(header)) {
      cell.note = "필수 컬럼";
    }
  });
  applyHeaderStyle(headerRow);

  data.views = [{ state: "frozen", ySplit: headerRowIndex }];
  data.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: {
      row: headerRowIndex,
      column: APPLICANT_EXCEL_HEADERS.length,
    },
  };

  const widths = [12, 8, 12, 14, 14, 12, 22, 12, 10, 8, 12, 14, 12];
  data.columns = APPLICANT_EXCEL_HEADERS.map((_, i) => ({
    width: widths[i] ?? 14,
  }));
  setTextColumn(data, APPLICANT_EXCEL_HEADERS.indexOf("연락처") + 1);
  setTextColumn(data, APPLICANT_EXCEL_HEADERS.indexOf("보호자연락처") + 1);
  setTextColumn(data, APPLICANT_EXCEL_HEADERS.indexOf("생년월일") + 1);

  const guide = wb.addWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
  guide.addRow(["대회", sanitizePlainCell(input.eventTitle)]);
  guide.addRow([]);
  guide.addRow([
    "체중기준 vs 체중",
    "체중기준=신청 체급의 기준값(예: -63.5kg, +91kg). 체중=선수 실제 체중(예: 62.8, 숫자만).",
  ]);
  guide.addRow([
    "주의",
    "`63.5`처럼 숫자만 입력하지 마세요. `-63.5kg` 또는 `+91kg`처럼 체급 기준과 동일하게 입력하세요.",
  ]);
  guide.addRow([]);

  const ruleHeader = guide.addRow([...GUIDE_TABLE_HEADERS]);
  applyHeaderStyle(ruleHeader);
  for (const row of buildGuideRules(input.divisions)) {
    guide.addRow([
      row.field,
      row.required,
      sanitizePlainCell(row.example),
      sanitizePlainCell(row.rule),
    ]);
  }

  guide.addRow([]);
  guide.addRow(["실제 입력 예시 (업로드하지 마세요 — 참고용)"]);
  const exampleHeader = guide.addRow([
    "선수명",
    "성별",
    "생년월일",
    "연락처",
    "체육관명",
    "경기구분",
    "체급",
    "체중기준",
    "종목",
    "체중",
    "보호자이름",
    "보호자연락처",
    "메모",
  ]);
  applyHeaderStyle(exampleHeader);

  const d1 = input.divisions[0];
  const d2 =
    input.divisions.find(
      (d) =>
        d.id !== d1?.id &&
        (d.weightLimitText?.includes("+") ||
          weightChip(d).includes("+") ||
          d.ageGroup !== d1?.ageGroup),
    ) ?? input.divisions[1] ?? d1;

  if (d1) {
    const ex1 = guide.addRow([
      "홍길동",
      "남성",
      "2008-05-12",
      "010-1234-5678",
      "마포킥복싱",
      d1.ageGroup ?? "",
      weightChip(d1),
      weightLimit(d1),
      formatDivisionSportTitle(d1) ?? "",
      "62.8",
      "김보호",
      "010-1111-2222",
      "첫 출전",
    ]);
    ex1.getCell(4).numFmt = "@";
    ex1.getCell(12).numFmt = "@";
  }
  if (d2) {
    const ex2 = guide.addRow([
      "김영희",
      "여성",
      "2007-11-03",
      "010-2345-6789",
      "서울무에타이",
      d2.ageGroup ?? "",
      weightChip(d2),
      weightLimit(d2),
      formatDivisionSportTitle(d2) ?? "",
      "67.2",
      "",
      "",
      "-",
    ]);
    ex2.getCell(4).numFmt = "@";
  }

  guide.addRow([]);
  guide.addRow(["현재 대회 사용 가능 경기구분/체급"]);
  const lookupHeader = guide.addRow(["경기구분", "성별", "체급", "종목"]);
  applyHeaderStyle(lookupHeader);
  for (const d of input.divisions) {
    guide.addRow([
      sanitizePlainCell(d.ageGroup ?? "-"),
      sanitizePlainCell(formatDivisionGenderLabel(d.gender) ?? "-"),
      sanitizePlainCell(weightChip(d) || "-"),
      sanitizePlainCell(formatDivisionSportTitle(d) ?? "-"),
    ]);
  }

  guide.columns = [
    { width: 14 },
    { width: 10 },
    { width: 28 },
    { width: 48 },
  ];
  guide.views = [{ state: "frozen", ySplit: 1 }];

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
