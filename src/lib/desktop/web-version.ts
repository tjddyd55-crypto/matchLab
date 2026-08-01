/**
 * Desktop이 조회하는 웹 배포 식별자 SSOT (서버).
 * Railway/배포 env에서만 읽으며 secret·내부 host는 반환하지 않는다.
 */
export const DESKTOP_MINIMUM_VERSION_DEFAULT = "1.0.1";

export type DesktopWebVersionPayload = {
  webVersion: string;
  desktopMinimumVersion: string;
};

function shortId(raw: string | undefined | null, len = 12): string | null {
  const v = raw?.trim();
  if (!v) return null;
  return v.length <= len ? v : v.slice(0, len);
}

/**
 * 배포 식별자. commit SHA 우선, 없으면 deployment ID / package.
 * 시각·UUID·요청마다 바뀌는 값 금지. 전체 env dump 금지.
 */
export function resolveDesktopWebVersion(): string {
  const fromCommit =
    shortId(process.env.RAILWAY_GIT_COMMIT_SHA, 7) ||
    shortId(process.env.VERCEL_GIT_COMMIT_SHA, 7) ||
    shortId(process.env.COMMIT_SHA, 7) ||
    shortId(process.env.NEXT_PUBLIC_BUILD_ID, 12);
  if (fromCommit) return fromCommit;

  const fromDeploy =
    shortId(process.env.RAILWAY_DEPLOYMENT_ID, 12) ||
    shortId(process.env.RAILWAY_SNAPSHOT_ID, 12);
  if (fromDeploy) return fromDeploy;

  const fromPackage = shortId(process.env.npm_package_version, 32);
  if (fromPackage) return `pkg-${fromPackage}`;

  return "local-dev";
}

export function getDesktopWebVersionPayload(): DesktopWebVersionPayload {
  const minimum =
    process.env.MATCHON_DESKTOP_MINIMUM_VERSION?.trim() ||
    DESKTOP_MINIMUM_VERSION_DEFAULT;

  return {
    webVersion: resolveDesktopWebVersion(),
    desktopMinimumVersion: minimum,
  };
}
