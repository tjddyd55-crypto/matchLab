/**
 * 홈 MATCHON Manager 다운로드 SSOT
 *   npm run verify:public-home-manager-download
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MATCHON_MANAGER_GITHUB_FULL_NAME,
  MATCHON_MANAGER_PUBLISHED_VERSION,
  getMatchonManagerDownloadInfo,
} from "../src/lib/desktop/manager-download";

function main() {
  const info = getMatchonManagerDownloadInfo();
  assert.equal(info.productName, "MATCHON Manager");
  assert.equal(info.version, MATCHON_MANAGER_PUBLISHED_VERSION);
  assert.equal(info.fileName, `MATCHON-Manager-Setup-${info.version}.exe`);
  assert.equal(info.releaseTag, `desktop-v${info.version}`);
  assert.equal(info.githubRepo, MATCHON_MANAGER_GITHUB_FULL_NAME);
  assert.match(
    info.downloadUrl,
    new RegExp(
      `^https://github\\.com/${MATCHON_MANAGER_GITHUB_FULL_NAME}/releases/download/desktop-v`,
    ),
  );
  assert.ok(info.downloadUrl.endsWith(info.fileName));
  assert.equal(
    info.latestDownloadUrl,
    `https://github.com/${MATCHON_MANAGER_GITHUB_FULL_NAME}/releases/latest/download/${info.fileName}`,
  );

  // Must not advertise unpublished package bumps (e.g. desktop 1.0.4 without a Release).
  const desktopPkg = JSON.parse(
    readFileSync(join(process.cwd(), "desktop/package.json"), "utf8"),
  ) as { version?: string };
  if (
    desktopPkg.version &&
    desktopPkg.version !== MATCHON_MANAGER_PUBLISHED_VERSION
  ) {
    assert.notEqual(
      info.version,
      desktopPkg.version,
      "public download version must follow published Release, not desktop package bump",
    );
  }

  const page = readFileSync(
    join(process.cwd(), "src/app/(public)/page.tsx"),
    "utf8",
  );
  assert.ok(page.includes("PublicHomeManagerDownloadSection"));
  assert.ok(page.includes("getMatchonManagerDownloadInfo"));

  const section = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/events/public/PublicHomeManagerDownloadSection.tsx",
    ),
    "utf8",
  );
  assert.ok(section.includes('id="download"'));
  assert.ok(section.includes("Windows용 다운로드"));
  assert.ok(section.includes("latestDownloadUrl"));

  const footer = readFileSync(
    join(process.cwd(), "src/components/layout/PublicFooter.tsx"),
    "utf8",
  );
  assert.ok(footer.includes("/#download"));
  assert.ok(footer.includes("프로그램 다운로드"));

  console.log("verify:public-home-manager-download OK");
  console.log(JSON.stringify(info, null, 2));
}

main();
