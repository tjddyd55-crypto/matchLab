/**
 * Auth·계정용 synthetic/internal 이메일 판별 SSOT.
 * UI에서 연락 이메일로 노출하지 않는다.
 */
import {
  isInternalPlaceholderEmail,
  isSyntheticAuthEmail,
} from "@/lib/member-gym/owner-account";

export function isInternalSyntheticEmail(
  email: string | null | undefined,
): boolean {
  return isSyntheticAuthEmail(email);
}

export function isInternalPlaceholderAccountEmail(
  email: string | null | undefined,
): boolean {
  return isInternalPlaceholderEmail(email);
}
