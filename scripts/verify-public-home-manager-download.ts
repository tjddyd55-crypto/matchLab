/**
 * 홈 MATCHON Manager 다운로드 SSOT
 *   npm run verify:public-home-manager-download
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getMatchonManagerDownloadInfo } from "../src/lib/desktop/manager-download";

function main() {
  const info = getMatchonManagerDownloadInfo();
  assert.equal(info.productName, "MATCHON Manager");
  assert.match(info.version, /^\d+\.\d+\.\d+$/);
  assert.equal(info.fileName, `MATCHON-Manager-Setup-${info.version}.exe`);
  assert.equal(info.releaseTag, `desktop-v${info.version}`);
  assert.match(
    info.downloadUrl,
    /^https:\/\/github\.com\/tjddyd55-crypto\/matchLab\/releases\/download\/desktop-v/,
  );
  assert.ok(info.downloadUrl.endsWith(info.fileName));

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
