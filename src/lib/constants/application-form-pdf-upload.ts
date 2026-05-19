/** 공식 신청서 템플릿 PDF 업로드 — 클라이언트 선제 검증용 */
export const APPLICATION_FORM_PDF_MAX_BYTES = 10 * 1024 * 1024;

export const APPLICATION_FORM_PDF_MIME = "application/pdf";

/** fieldsJson 좌표계: 페이지 좌상단(top-left) 기준, 단위 pt(1/72 inch). PDF 렌더 시 pdf-lib bottom-left로 변환 */
export const APPLICATION_FORM_COORDINATE_SYSTEM =
  "top-left" as const;
