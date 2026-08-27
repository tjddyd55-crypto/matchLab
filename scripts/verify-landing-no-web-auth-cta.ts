/**
 * 공개 랜딩에서 웹 로그인/회원가입/시작 CTA 진입점이 없는지 검증.
 *   npm run verify:landing-no-web-auth-cta
 *
 * 범위: 메인 랜딩 구성 컴포넌트 + PublicNav/Footer.
 * /login · /join route 자체 삭제는 검증하지 않음 (Manager/invite 의존).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const LANDING_FILES = [
  "src/app/(public)/page.tsx",
  "src/components/domain/events/public/PublicHomeHero.tsx",
  "src/components/domain/events/public/PublicHomeFeaturesSection.tsx",
  "src/components/domain/events/public/PublicHomeGymSection.tsx",
  "src/components/domain/events/public/PublicHomeAudienceSection.tsx",
  "src/components/domain/events/public/PublicHomeHowItWorksSection.tsx",
  "src/components/domain/events/public/PublicHomeManagerDownloadSection.tsx",
  "src/components/domain/events/public/PublicHomeOrganizerCtaSection.tsx",
  "src/components/domain/events/public/PublicHomePartnersSection.tsx",
  "src/components/domain/events/public/PublicHomeProductVisual.tsx",
  "src/components/layout/PublicNav.tsx",
  "src/components/layout/PublicFooter.tsx",
  "src/components/layout/PublicShell.tsx",
] as const;

const FORBIDDEN_HREF =
  /href\s*=\s*["'`]\/(login|join|signup|register|auth)(\/[^"'`]*)?["'`]/g;
const FORBIDDEN_COPY =
  /웹에서 시작하기|지금 가입하세요|계정을 만들어 시작하세요|브라우저에서 관리하세요|로그인해서 시작하세요/;

function main() {
  let hrefHits = 0;
  let copyHits = 0;

  for (const rel of LANDING_FILES) {
    const src = read(rel);
    const hrefMatches = src.match(FORBIDDEN_HREF) ?? [];
    const copyMatch = FORBIDDEN_COPY.test(src);
    hrefHits += hrefMatches.length;
    if (copyMatch) copyHits += 1;

    assert.equal(
      hrefMatches.length,
      0,
      `${rel} must not link to web auth routes: ${hrefMatches.join(", ")}`,
    );
    assert.equal(
      copyMatch,
      false,
      `${rel} must not use web-start / signup CTA copy`,
    );
  }

  const nav = read("src/components/layout/PublicNav.tsx");
  assert.match(nav, /PublicManagerDownloadButton/);
  assert.doesNotMatch(nav, />\s*로그인\s*</);
  assert.doesNotMatch(nav, />\s*시작하기\s*</);
  assert.doesNotMatch(nav, />\s*회원가입\s*</);

  const footer = read("src/components/layout/PublicFooter.tsx");
  assert.doesNotMatch(footer, />\s*로그인\s*</);
  assert.doesNotMatch(footer, />\s*회원가입\s*</);

  const hero = read(
    "src/components/domain/events/public/PublicHomeHero.tsx",
  );
  assert.match(hero, /MATCHON Manager 다운로드/);
  assert.match(hero, /주요 기능 보기/);

  console.log(
    JSON.stringify(
      {
        filesChecked: LANDING_FILES.length,
        forbiddenHrefCount: hrefHits,
        forbiddenCopyFileCount: copyHits,
      },
      null,
      2,
    ),
  );
  console.log("verify:landing-no-web-auth-cta OK");
}

main();
