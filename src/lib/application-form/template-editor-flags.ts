/** 개발 환경에서만 JSON·내부 매핑 등 고급 편집 UI 노출 */
export function isTemplateEditorDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

/** 운영 UI에서 항목 ID를 자동 재생성할지 판단 */
export function shouldAutoRegenerateFieldId(currentId: string): boolean {
  const id = currentId.trim();
  if (!id) return true;
  if (id === "field") return true;
  if (/^field_\d+$/.test(id)) return true;
  return false;
}
