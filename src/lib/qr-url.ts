import type { PublicEventTabId } from "@/lib/public-event-tabs";
import { publicEventTabHref } from "@/lib/public-event-tabs";
import { EventStatus } from "@/lib/enums";

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

export function buildPublicEventQrUrl(
  slug: string,
  tab?: PublicEventTabId,
  baseUrl?: string,
): string {
  if (!slug.trim()) return buildAbsoluteUrl("/events", baseUrl);
  const path = tab ? publicEventTabHref(slug.trim(), tab) : publicEventTabHref(slug.trim(), "overview");
  return buildAbsoluteUrl(path, baseUrl);
}

export function buildEventBracketQrUrl(
  slug: string,
  baseUrl?: string,
): string {
  return buildPublicEventQrUrl(slug, "brackets", baseUrl);
}

export function buildEventResultsQrUrl(
  slug: string,
  baseUrl?: string,
): string {
  return buildPublicEventQrUrl(slug, "results", baseUrl);
}

export function buildEventLiveQrUrl(slug: string, baseUrl?: string): string {
  return buildPublicEventQrUrl(slug, "live", baseUrl);
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
