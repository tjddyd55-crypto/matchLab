/**
 * MemberSportTemplate naming SSOT.
 * - templateName (`name`): Admin internal label
 * - displayName: Gym / member / signup user-facing label
 */
export function memberSportTemplateDisplayName(template: {
  displayName?: string | null;
  name: string;
}): string {
  const display = template.displayName?.trim();
  if (display) return display;
  return template.name.trim() || "종목";
}

export function memberSportTemplateAdminName(template: {
  name: string;
}): string {
  return template.name.trim() || "템플릿";
}

export const MEMBER_SPORT_DISPLAY_NAME_MAX = 40;
export const MEMBER_SPORT_TEMPLATE_NAME_MAX = 80;

export function validateMemberSportDisplayName(raw: string): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "표시명을 입력해 주세요." };
  }
  if (value.length > MEMBER_SPORT_DISPLAY_NAME_MAX) {
    return {
      ok: false,
      message: `표시명은 ${MEMBER_SPORT_DISPLAY_NAME_MAX}자 이하여야 합니다.`,
    };
  }
  return { ok: true, value };
}

export function validateMemberSportTemplateName(raw: string): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "템플릿명을 입력해 주세요." };
  }
  if (value.length > MEMBER_SPORT_TEMPLATE_NAME_MAX) {
    return {
      ok: false,
      message: `템플릿명은 ${MEMBER_SPORT_TEMPLATE_NAME_MAX}자 이하여야 합니다.`,
    };
  }
  return { ok: true, value };
}
