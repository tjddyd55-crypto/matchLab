import { readFileSync } from "node:fs";
import { join } from "node:path";

/** GitHub Releases — desktop/package.json `build.publish` 와 동일 repo */
const GITHUB_RELEASES_BASE =
  "https://github.com/tjddyd55-crypto/matchLab/releases/download";

export type MatchonManagerDownloadInfo = {
  productName: string;
  version: string;
  fileName: string;
  downloadUrl: string;
  releaseTag: string;
  osLabel: string;
};

type DesktopPackageJson = {
  version?: string;
  productName?: string;
  build?: {
    nsis?: {
      artifactName?: string;
    };
  };
};

function readDesktopPackageJson(): DesktopPackageJson {
  const raw = readFileSync(join(process.cwd(), "desktop/package.json"), "utf8");
  return JSON.parse(raw) as DesktopPackageJson;
}

/**
 * MATCHON Manager Windows installer — GitHub Release asset SSOT.
 * - desktop/package.json version + nsis artifactName 패턴
 * - release tag: desktop-v{version} (기존 GitHub Release 규칙)
 */
export function getMatchonManagerDownloadInfo(): MatchonManagerDownloadInfo {
  const pkg = readDesktopPackageJson();
  const version = pkg.version?.trim() || "1.0.3";
  const productName = pkg.productName?.trim() || "MATCHON Manager";
  const artifactPattern =
    pkg.build?.nsis?.artifactName ?? "MATCHON-Manager-Setup-${version}.${ext}";
  const fileName = artifactPattern
    .replace("${version}", version)
    .replace("${ext}", "exe");
  const releaseTag = `desktop-v${version}`;
  const downloadUrl = `${GITHUB_RELEASES_BASE}/${releaseTag}/${fileName}`;

  return {
    productName,
    version,
    fileName,
    downloadUrl,
    releaseTag,
    osLabel: "Windows 10/11",
  };
}
