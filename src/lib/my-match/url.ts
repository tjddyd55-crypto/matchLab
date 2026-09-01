import { getAppBaseUrl } from "@/lib/app-url";
import { buildMyMatchToken } from "@/lib/my-match/token";

export function buildMyMatchPublicPath(
  eventSlug: string,
  fighterId: string,
): string {
  const token = buildMyMatchToken({ eventSlug, fighterId });
  return `/events/${encodeURIComponent(eventSlug)}/my-match/${encodeURIComponent(token)}`;
}

export function buildMyMatchPublicUrl(
  eventSlug: string,
  fighterId: string,
  origin?: string,
): string {
  const base = (origin ?? getAppBaseUrl()).replace(/\/$/, "");
  return `${base}${buildMyMatchPublicPath(eventSlug, fighterId)}`;
}
