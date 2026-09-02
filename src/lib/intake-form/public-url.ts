import { getAppBaseUrl } from "@/lib/app-url";

export function buildIntakeFormPublicPath(publicToken: string): string {
  return `/forms/${encodeURIComponent(publicToken)}`;
}

export function buildIntakeFormPublicUrl(
  publicToken: string,
  origin?: string,
): string {
  const base = (origin ?? getAppBaseUrl()).replace(/\/$/, "");
  return `${base}${buildIntakeFormPublicPath(publicToken)}`;
}
