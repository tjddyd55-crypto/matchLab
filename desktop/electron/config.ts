import { app } from "electron";

/** Production Railway host (single SSOT value for default prod URL). */
export const PRODUCTION_HOST = "app-production-79ad.up.railway.app";
export const PRODUCTION_BASE_URL = `https://${PRODUCTION_HOST}`;

const PREVIEW_HOST_SUFFIX = ".up.railway.app";

export type DesktopEnvironmentName = "development" | "preview" | "production";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Electron이 접속할 MATCHON 서버 base URL.
 * MATCHON_DESKTOP_BASE_URL이 있으면 우선. 없으면 개발=localhost, 패키지=Production.
 */
export function getDesktopBaseUrl(): string {
  const fromEnv = process.env.MATCHON_DESKTOP_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);

  if (!app.isPackaged) {
    return "http://localhost:8080";
  }
  return PRODUCTION_BASE_URL;
}

export function getDesktopEnvironmentName(): DesktopEnvironmentName {
  const base = getDesktopBaseUrl();
  try {
    const host = new URL(base).hostname;
    if (host === "localhost" || host === "127.0.0.1") return "development";
    if (host === PRODUCTION_HOST) return "production";
    if (host.endsWith(PREVIEW_HOST_SUFFIX)) return "preview";
  } catch {
    /* ignore */
  }
  return app.isPackaged ? "production" : "development";
}

/** 허용 host SSOT — 개발에서만 localhost. Production 빌드는 Production만. */
export function getAllowedHosts(): readonly string[] {
  if (app.isPackaged) {
    return [PRODUCTION_HOST];
  }

  const hosts = new Set<string>(["localhost", "127.0.0.1", PRODUCTION_HOST]);
  const fromEnv = process.env.MATCHON_DESKTOP_BASE_URL?.trim();
  if (fromEnv) {
    try {
      hosts.add(new URL(fromEnv).hostname);
    } catch {
      /* ignore */
    }
  }
  const preview = process.env.MATCHON_DESKTOP_PREVIEW_HOST?.trim();
  if (preview) hosts.add(preview);
  return [...hosts];
}

export function isAllowedMatchonUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const host = parsed.hostname;
  const allowed = getAllowedHosts();

  if (app.isPackaged) {
    return parsed.protocol === "https:" && allowed.includes(host);
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }

  return parsed.protocol === "https:" && allowed.includes(host);
}

export function isExternalUrl(urlString: string): boolean {
  return !isAllowedMatchonUrl(urlString);
}

export const SESSION_PARTITION = "persist:matchon-manager";
export const DESKTOP_ENTRY_PATH = "/desktop";
