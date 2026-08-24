/**
 * MATCHON Manager 공개 설치 파일 다운로드 SSOT.
 *
 * - GitHub Release에 **실제로 게시된** installer만 가리킨다.
 * - `desktop/package.json` version과 분리한다(패키지 bump ≠ Release 게시).
 * - 새 Setup.exe를 `desktop-v{version}` Release에 올린 뒤에만
 *   `MATCHON_MANAGER_PUBLISHED_VERSION`(또는 env)을 올린다.
 */

/** Public GitHub repository that hosts Manager installers. */
export const MATCHON_MANAGER_GITHUB_OWNER = "tjddyd55-crypto";
export const MATCHON_MANAGER_GITHUB_REPO = "matchLab";
export const MATCHON_MANAGER_GITHUB_FULL_NAME =
  `${MATCHON_MANAGER_GITHUB_OWNER}/${MATCHON_MANAGER_GITHUB_REPO}` as const;

/**
 * Last installer version confirmed on GitHub Releases (tag `desktop-v{version}`).
 * Current published Latest: desktop-v1.0.3 / MATCHON-Manager-Setup-1.0.3.exe
 */
export const MATCHON_MANAGER_PUBLISHED_VERSION = "1.0.3";

const GITHUB_RELEASES_DOWNLOAD_BASE = `https://github.com/${MATCHON_MANAGER_GITHUB_FULL_NAME}/releases/download`;
const GITHUB_RELEASES_LATEST_DOWNLOAD_BASE = `https://github.com/${MATCHON_MANAGER_GITHUB_FULL_NAME}/releases/latest/download`;

export type MatchonManagerDownloadInfo = {
  productName: string;
  version: string;
  fileName: string;
  /** Tag-pinned asset URL (stable permalink for this version). */
  downloadUrl: string;
  /**
   * `releases/latest/download/{fileName}` — preferred end-user link;
   * GitHub redirects to the Latest release asset with this name.
   */
  latestDownloadUrl: string;
  releaseTag: string;
  osLabel: string;
  githubRepo: typeof MATCHON_MANAGER_GITHUB_FULL_NAME;
};

function resolvePublishedVersion(): string {
  const fromEnv = process.env.MATCHON_MANAGER_PUBLISHED_VERSION?.trim();
  if (fromEnv && /^\d+\.\d+\.\d+$/.test(fromEnv)) {
    return fromEnv;
  }
  return MATCHON_MANAGER_PUBLISHED_VERSION;
}

function resolveProductName(): string {
  return "MATCHON Manager";
}

function buildSetupFileName(version: string): string {
  return `MATCHON-Manager-Setup-${version}.exe`;
}

function buildReleaseTag(version: string): string {
  return `desktop-v${version}`;
}

/**
 * MATCHON Manager Windows installer — GitHub Release asset SSOT.
 * Prefer `latestDownloadUrl` for end-user distribution; `downloadUrl` for pinned audits.
 */
export function getMatchonManagerDownloadInfo(): MatchonManagerDownloadInfo {
  const overrideUrl = process.env.MATCHON_MANAGER_DOWNLOAD_URL?.trim();
  const version = resolvePublishedVersion();
  const productName = resolveProductName();
  const fileName = buildSetupFileName(version);
  const releaseTag = buildReleaseTag(version);
  const downloadUrl =
    overrideUrl && /^https:\/\//i.test(overrideUrl)
      ? overrideUrl
      : `${GITHUB_RELEASES_DOWNLOAD_BASE}/${releaseTag}/${fileName}`;
  const latestDownloadUrl = `${GITHUB_RELEASES_LATEST_DOWNLOAD_BASE}/${fileName}`;

  return {
    productName,
    version,
    fileName,
    downloadUrl,
    latestDownloadUrl,
    releaseTag,
    osLabel: "Windows 10/11",
    githubRepo: MATCHON_MANAGER_GITHUB_FULL_NAME,
  };
}
