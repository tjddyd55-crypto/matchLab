import ExcelJS from "exceljs";
import {
  APPLICANT_EXCEL_HEADERS,
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

function guideLine(d: ApplicantExcelSampleDivision): string {
  const age = d.ageGroup?.trim() || "-";
  const gender = formatDivisionGenderLabel(d.gender) ?? "-";
  const weight = formatDivisionWeightChipLabel(d) ?? "-";
  const sport = formatDivisionSportTitle(d);
  return sport ? `${age} / ${gender} / ${weight} / ${sport}` : `${age} / ${gender} / ${weight}`;
}

export async function buildApplicantExcelSampleWorkbook(input: {
  eventTitle: string;
  divisions: ApplicantExcelSampleDivision[];
}): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  data.addRow([...APPLICANT_EXCEL_HEADERS]);
  data.getRow(1).font = { bold: true };

  const first = input.divisions[0];
  if (first) {
    data.addRow([
      "홍길동",
      "남",
      "2008-03-15",
      "010-1234-5678",
      "예시체육관",
      first.ageGroup ?? "",
      formatDivisionWeightChipLabel(first) ?? first.weightClass ?? "",
      "",
      formatDivisionSportTitle(first) ?? "",
      "",
      "",
      "",
      "",
    ]);
  }

  data.columns = APPLICANT_EXCEL_HEADERS.map(() => ({ width: 16 }));

  const guide = wb.addWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
  guide.addRow(["대회", sanitizePlainCell(input.eventTitle)]);
  guide.addRow([]);
  guide.addRow(["필수 컬럼", "선수명, 성별, 생년월일, 체육관명, 경기구분, 체급"]);
  guide.addRow(["성별 입력값", "남 / 여 (남성, 여성, male, female 가능)"]);
  guide.addRow(["생년월일", "YYYY-MM-DD 또는 YYYY.MM.DD"]);
  guide.addRow(["체중기준", "-63.5kg, +91kg 처럼 입력. 체급 칸에 함께 적어도 됩니다."]);
  guide.addRow(["신청/입금 상태", "Excel에서 받지 않습니다. 주최자 일괄등록 정책(승인·미입금)을 따릅니다."]);
  guide.addRow(["체육관", "표시 이름으로 저장합니다. MATCHON 체육관 계정을 자동 생성하지 않습니다."]);
  guide.addRow([]);
  guide.addRow(["이 대회에서 사용 가능한 경기구분/체급"]);
  guide.addRow(["경기구분 / 성별 / 체급 / 종목"]);
  for (const d of input.divisions) {
    guide.addRow([sanitizePlainCell(guideLine(d))]);
  }
  guide.columns = [{ width: 72 }];
  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
