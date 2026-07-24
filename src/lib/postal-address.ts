/**
 * 우편번호·기본주소·상세주소 표시용 helper.
 * DB에는 필드를 분리 저장하고, 화면 표시에만 이 포맷을 사용한다.
 */
export type PostalAddressParts = {
  postalCode?: string | null;
  address?: string | null;
  addressDetail?: string | null;
};

export function formatPostalAddress(parts: PostalAddressParts): string {
  const postal = parts.postalCode?.trim() ?? "";
  const base = parts.address?.trim() ?? "";
  const detail = parts.addressDetail?.trim() ?? "";
  const line = [base, detail].filter(Boolean).join(" ");
  if (!line && !postal) return "";
  if (postal && line) return `(${postal}) ${line}`;
  if (postal) return `(${postal})`;
  return line;
}

export function normalizePostalCode(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? "";
  if (!v) return null;
  if (!/^\d{5}$/.test(v)) return null;
  return v;
}
