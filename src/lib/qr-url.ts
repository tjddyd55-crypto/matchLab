import type { PublicEventTabId } from "@/lib/public-event-tabs";
import { publicEventTabHref } from "@/lib/public-event-tabs";
import type { SpectatorWatchTabId } from "@/lib/public-event-watch";
import { spectatorWatchHref } from "@/lib/public-event-watch";
import { EventStatus } from "@/lib/enums";
import {
  isSpectatorContentAccessible,
  toSpectatorAccessFields,
} from "@/lib/spectator-access";

const PRODUCTION_FALLBACK_URL =
  "https://app-production-79ad.up.railway.app";

const EXCLUDED_PUBLIC_STATUSES: EventStatus[] = [
  EventStatus.draft,
  EventStatus.cancelled,
];

/** env에 설정된 base URL (NEXT_PUBLIC_APP_URL → APP_URL → VERCEL_URL) */
export function resolveConfiguredAppBaseUrl(): string | null {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) return appUrl;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return null;
}

/** 요청 헤더에서 origin 추출 (localhost 제외) */
export function resolveAppBaseUrlFromHeaders(
  headers: Headers,
): string | null {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headers.get("host")?.trim();
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return null;
  }
  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

/** 서버 컴포넌트·QR 생성용 base URL */
export function getServerAppBaseUrl(headers?: Headers): string {
  return (
    resolveConfiguredAppBaseUrl() ??
    (headers ? resolveAppBaseUrlFromHeaders(headers) : null) ??
    PRODUCTION_FALLBACK_URL
  );
}

/** 클라이언트에서 base URL (window.origin 우선, localhost 제외) */
export function getClientAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (
      origin &&
      !origin.includes("localhost") &&
      !origin.includes("127.0.0.1")
    ) {
      return origin;
    }
  }
  return resolveConfiguredAppBaseUrl() ?? PRODUCTION_FALLBACK_URL;
}

export function buildAbsoluteUrl(path: string, baseUrl?: string): string {
  const base = (baseUrl ?? getServerAppBaseUrl()).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function buildJudgeLoginQrUrl(
  eventId: string,
  loginId?: string | null,
  baseUrl?: string,
): string {
  if (!eventId.trim()) return buildAbsoluteUrl("/judge/login", baseUrl);
  const params = new URLSearchParams({ eventId: eventId.trim() });
  if (loginId?.trim()) {
    params.set("loginId", loginId.trim());
  }
  return buildAbsoluteUrl(`/judge/login?${params.toString()}`, baseUrl);
}

export function buildCourtScoreJudgeUrl(
  courtId: string,
  baseUrl?: string,
): string {
  return buildAbsoluteUrl(`/judge/courts/${courtId}/score`, baseUrl);
}

export function buildCourtHeadJudgeUrl(
  courtId: string,
  baseUrl?: string,
): string {
  return buildAbsoluteUrl(`/judge/courts/${courtId}/head`, baseUrl);
}

export function buildPublicEventQrUrl(
  slug: string,
  tab?: PublicEventTabId,
  baseUrl?: string,
): string {
  if (!slug.trim()) return buildAbsoluteUrl("/events", baseUrl);
  const path = tab
    ? publicEventTabHref(slug.trim(), tab)
    : publicEventTabHref(slug.trim(), "overview");
  return buildAbsoluteUrl(path, baseUrl);
}

/** 관람객 전용 watch 페이지 — QR·현장 관람용 */
export function buildSpectatorWatchQrUrl(
  slug: string,
  tab: SpectatorWatchTabId = "brackets",
  baseUrl?: string,
): string {
  if (!slug.trim()) return buildAbsoluteUrl("/events", baseUrl);
  return buildAbsoluteUrl(spectatorWatchHref(slug.trim(), tab), baseUrl);
}

export function buildEventBracketQrUrl(
  slug: string,
  baseUrl?: string,
): string {
  return buildSpectatorWatchQrUrl(slug, "brackets", baseUrl);
}

export function buildEventResultsQrUrl(
  slug: string,
  baseUrl?: string,
): string {
  return buildSpectatorWatchQrUrl(slug, "results", baseUrl);
}

export function buildEventLiveQrUrl(slug: string, baseUrl?: string): string {
  return buildSpectatorWatchQrUrl(slug, "live", baseUrl);
}

/** 관람객 통합 QR — watch 페이지 기본(대진표) 탭 */
export function buildSpectatorWatchUnifiedQrUrl(
  slug: string,
  baseUrl?: string,
): string {
  if (!slug.trim()) return buildAbsoluteUrl("/events", baseUrl);
  return buildAbsoluteUrl(`/events/${slug.trim()}/watch`, baseUrl);
}

export function isEventPublicForSpectatorQr(
  status: EventStatus,
  publicSlug: string | null | undefined,
): boolean {
  return (
    Boolean(publicSlug?.trim()) &&
    !EXCLUDED_PUBLIC_STATUSES.includes(status)
  );
}

export type SpectatorQrAvailabilityContext = {
  status: EventStatus;
  publicSlug: string | null | undefined;
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: string | Date | null;
  spectatorAccessEndAt: string | Date | null;
  liveStreamingEnabled: boolean;
  publicLiveStreamCount: number;
};

/** 대회 안내(overview) QR — slug·공개 상태만 확인 */
export function isSpectatorOverviewQrEnabled(
  ctx: SpectatorQrAvailabilityContext,
): boolean {
  return isEventPublicForSpectatorQr(ctx.status, ctx.publicSlug);
}

/** 대진표·결과·라이브 QR — 공개 상태 + 관람 기간 + (live) 스트리밍 조건 */
export function isSpectatorTabQrEnabled(
  ctx: SpectatorQrAvailabilityContext,
  tab: "brackets" | "results" | "live",
): boolean {
  if (!isEventPublicForSpectatorQr(ctx.status, ctx.publicSlug)) return false;

  const access = toSpectatorAccessFields(ctx);
  if (!isSpectatorContentAccessible(access)) return false;

  if (tab === "live") {
    if (!ctx.liveStreamingEnabled) return false;
    if (ctx.publicLiveStreamCount <= 0) return false;
  }

  return true;
}

export function spectatorTabQrDisabledReason(
  ctx: SpectatorQrAvailabilityContext,
  tab: "brackets" | "results" | "live" | "overview",
): string | undefined {
  if (!ctx.publicSlug?.trim()) {
    return "공개 slug가 설정되지 않았습니다. 기본 설정에서 slug를 등록하세요.";
  }
  if (!isEventPublicForSpectatorQr(ctx.status, ctx.publicSlug)) {
    return "작성 중(draft) 또는 취소된 대회는 관람객 QR을 사용할 수 없습니다. 신청 공개(OPEN) 이후 상태에서 활성화됩니다.";
  }
  if (tab === "overview") return undefined;

  const access = toSpectatorAccessFields(ctx);
  if (!isSpectatorContentAccessible(access)) {
    if (ctx.spectatorAccessEnabled) {
      const now = new Date();
      const start = access.spectatorAccessStartAt;
      const end = access.spectatorAccessEndAt;
      if (start && now < start) {
        return "관람 공개 시작 전입니다. 설정한 관람 시작 시간 이후 QR을 사용하세요.";
      }
      if (end && now > end) {
        return "관람 공개 기간이 종료되었습니다.";
      }
      if (!start || !end) {
        return "관람 시간 제한이 켜져 있으나 시작·종료 시각이 설정되지 않았습니다.";
      }
    }
    return "현재 관람 공개 시간이 아닙니다.";
  }

  if (tab === "live") {
    if (!ctx.liveStreamingEnabled) {
      return "이 대회는 라이브 방송을 사용하지 않습니다. 대회 설정에서 라이브를 켠 뒤 QR을 사용하세요.";
    }
    if (ctx.publicLiveStreamCount <= 0) {
      return "공개된 라이브 시청 URL이 없습니다. 라이브 URL을 등록한 뒤 QR을 사용하세요.";
    }
  }

  return undefined;
}
