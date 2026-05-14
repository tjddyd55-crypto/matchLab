/** 대외·목록 화면용 마스킹 — 원본 값과 분리한다. */

export function maskGymPublicLabel(gymName: string): string {
  const t = gymName.trim();
  if (!t) return "○○ 체육관";
  const first = [...t][0] ?? "";
  return `${first}○○ 체육관`;
}

export function maskBirthYearOnly(date: Date): string {
  return `${date.getUTCFullYear()}년생`;
}

export function maskPhoneLoosely(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length <= 4) return "****";
  if (d.length <= 7) return `${d.slice(0, 2)}***`;
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}
