export const APPLICANT_EXCEL_HEADERS = [
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
] as const;

export type ApplicantExcelHeader = (typeof APPLICANT_EXCEL_HEADERS)[number];

export const APPLICANT_EXCEL_REQUIRED_HEADERS = [
  "선수명",
  "성별",
  "생년월일",
  "체육관명",
  "경기구분",
  "체급",
] as const satisfies readonly ApplicantExcelHeader[];

export const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
export const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";
export const APPLICANT_EXCEL_SAMPLE_FILENAME =
  "MATCHON_선수신청_업로드_샘플.xlsx";

export const APPLICANT_EXCEL_MAX_ROWS = 100;
export const APPLICANT_EXCEL_MAX_BYTES = 2 * 1024 * 1024;
