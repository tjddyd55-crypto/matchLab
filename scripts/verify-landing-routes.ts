/**
 * Landing route / CTA wiring (download-primary, no web auth entry).
 *   npm run verify:landing-routes
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const page = read("src/app/(public)/page.tsx");
  assert.match(page, /PublicHomeHero/);
  assert.match(page, /PublicHomeFeaturesSection/);
  assert.match(page, /PublicHomeGymSection/);
  assert.match(page, /PublicHomeAudienceSection/);
  assert.match(page, /PublicHomeHowItWorksSection/);
  assert.match(page, /PublicHomeManagerDownloadSection/);
  assert.match(page, /PublicHomeOrganizerCtaSection/);
  assert.match(page, /체육관 · 격투기 대회 운영 플랫폼/);
  assert.match(page, /MATCHON Manager에서 관리하세요/);
  assert.doesNotMatch(page, /웹에서 시작|가입하세요|로그인해서/);

  const hero = read(
    "src/components/domain/events/public/PublicHomeHero.tsx",
  );
  assert.doesNotMatch(hero, /href="\/login"/);
  assert.doesNotMatch(hero, /href="\/join"/);
  assert.doesNotMatch(hero, /웹에서 시작하기/);
  assert.match(hero, /체육관 관리부터/);
  assert.match(hero, /격투기 대회 운영까지/);
  assert.match(hero, /PublicManagerDownloadButton/);
  assert.match(hero, /주요 기능 보기/);
  assert.match(hero, /PublicHomeProductVisual/);
  assert.match(hero, /Windows용 PC 프로그램/);

  const features = read(
    "src/components/domain/events/public/PublicHomeFeaturesSection.tsx",
  );
  assert.match(features, /체육관 회원 관리/);
  assert.match(features, /선수 및 참가 신청 관리/);

  const gym = read(
    "src/components/domain/events/public/PublicHomeGymSection.tsx",
  );
  assert.match(gym, /체육관 운영도 MATCHON에서/);
  assert.match(gym, /이용권 관리/);
  assert.match(gym, /회원 등록 및 관리/);

  const visual = read(
    "src/components/domain/events/public/PublicHomeProductVisual.tsx",
  );
  assert.match(visual, /체육관 회원/);
  assert.match(visual, /전체 경기 편집/);

  const manager = read(
    "src/components/domain/events/public/PublicHomeManagerDownloadSection.tsx",
  );
  assert.match(manager, /PublicManagerDownloadButton/);
  assert.match(manager, /Windows용 MATCHON Manager 다운로드/);
  assert.doesNotMatch(manager, /href="\/login"|href="\/join"/);

  const finalCta = read(
    "src/components/domain/events/public/PublicHomeOrganizerCtaSection.tsx",
  );
  assert.match(finalCta, /PublicManagerDownloadButton/);
  assert.doesNotMatch(finalCta, /href="\/login"|href="\/join"|웹에서 시작하기/);

  const nav = read("src/components/layout/PublicNav.tsx");
  assert.match(nav, /\/#features/);
  assert.match(nav, /\/#gym/);
  assert.match(nav, /\/#manager/);
  assert.match(nav, /PublicManagerDownloadButton/);
  assert.match(nav, /MatchonLogo/);
  assert.doesNotMatch(nav, /href="\/login"|href="\/join"/);
  assert.doesNotMatch(nav, /html\.desktop-app|desktop-app-viewport/);

  const footer = read("src/components/layout/PublicFooter.tsx");
  assert.match(footer, /\/#manager/);
  assert.doesNotMatch(footer, /href="\/login"|href="\/join"/);

  const layout = read("src/lib/ui/desktop-app-layout.ts");
  assert.match(layout, /DESKTOP_APP_HTML_CLASS|desktop-app/);

  console.log("verify:landing-routes OK");
}

main();
