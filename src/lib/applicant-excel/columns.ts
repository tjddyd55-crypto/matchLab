export const APPLICANT_EXCEL_HEADERS = [
  "번호",
  "체육관명",
  "선수명",
  "성별",
  "생년월일",
  "나이",
  "키",
  "체중",
  "전적",
  "총전",
  "승",
  "무",
  "패",
  "운동경력",
  "주민등록번호",
  "보험가입 개인정보동의",
  "경기구분",
  "체급",
  "체중기준",
  "종목",
  "연락처",
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

/** 운영 파일·레거시 샘플 호환용 header alias → canonical */
export const APPLICANT_EXCEL_HEADER_ALIASES: Record<string, ApplicantExcelHeader> =
  {
    이름: "선수명",
    무게: "체중",
    비고: "메모",
    "비고/메모": "메모",
    소속: "체육관명",
    주민번호: "주민등록번호",
    보험동의: "보험가입 개인정보동의",
  };

/** 샘플 예시행 식별용 숨김 컬럼 (일반 Excel에는 없음) */
export const APPLICANT_EXCEL_INTERNAL_KIND_HEADER = "_matchon_kind";
export const APPLICANT_EXCEL_EXAMPLE_KIND = "example";
/** 번호 칸에 보이는 예시행 표시 */
export const APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL = "예시";

export const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
export const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";
export const APPLICANT_EXCEL_SAMPLE_FILENAME =
  "MATCHON_선수신청_업로드_샘플.xlsx";

export const APPLICANT_EXCEL_MAX_ROWS = 100;
export const APPLICANT_EXCEL_MAX_BYTES = 2 * 1024 * 1024;

/** 레거시 13컬럼 순서 (호환 검증용) */
export const APPLICANT_EXCEL_LEGACY_HEADERS = [
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
] as const satisfies readonly ApplicantExcelHeader[];

export function normalizeApplicantExcelHeaderLabel(
  raw: string,
): string {
  return raw.trim().replace(/\*+$/g, "").trim();
}

export function resolveApplicantExcelHeader(
  raw: string,
): ApplicantExcelHeader | null {
  const normalized = normalizeApplicantExcelHeaderLabel(raw);
  if (!normalized) return null;
  if ((APPLICANT_EXCEL_HEADERS as readonly string[]).includes(normalized)) {
    return normalized as ApplicantExcelHeader;
  }
  const aliased = APPLICANT_EXCEL_HEADER_ALIASES[normalized];
  return aliased ?? null;
}
