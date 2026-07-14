import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 가입 링크 공개 URL용 서명 토큰.
 * DB에는 tokenHash(랜덤)만 두고, 관리자 복사용 URL은 linkId+HMAC로 재구성한다.
 * 원문 랜덤 토큰은 저장하지 않는다.
 */
const SIG_HEX_LEN = 32;

function signingSecret(): string {
  const secret =
    process.env.MEMBER_GYM_JOIN_URL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MEMBER_GYM_JOIN_URL_SECRET 또는 AUTH_SECRET이 필요합니다.",
      );
    }
    return "dev-member-gym-join-url-secret";
  }
  return secret;
}

export function signMemberGymJoinLinkId(linkId: string): string {
  return createHmac("sha256", signingSecret())
    .update(`member-gym-join:${linkId}`, "utf8")
    .digest("hex")
    .slice(0, SIG_HEX_LEN);
}

export function buildStableMemberGymJoinToken(linkId: string): string {
  return `${linkId}.${signMemberGymJoinLinkId(linkId)}`;
}

export function parseStableMemberGymJoinToken(
  token: string,
): { linkId: string } | null {
  const raw = token.trim();
  const idx = raw.lastIndexOf(".");
  if (idx <= 0 || idx === raw.length - 1) return null;
  const linkId = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!/^[a-z0-9]{8,}$/i.test(linkId)) return null;
  if (!/^[a-f0-9]+$/i.test(sig) || sig.length !== SIG_HEX_LEN) return null;
  const expected = signMemberGymJoinLinkId(linkId);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { linkId };
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function buildStableMemberGymRegisterUrl(linkId: string): string {
  return `${appBaseUrl()}/member-gym-register/${buildStableMemberGymJoinToken(linkId)}`;
}

export const DEFAULT_MEMBER_GYM_JOIN_LINK_LABEL = "기본 회원사 가입 링크";
