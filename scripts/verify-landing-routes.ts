/**
 * Landing route / CTA wiring.
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
  assert.match(page, /PublicHomeHowItWorksSection/);
  assert.match(page, /PublicHomeManagerDownloadSection/);
  assert.match(page, /PublicHomeOrganizerCtaSection/);
  assert.match(page, /격투기 대회 운영 플랫폼/);

  const hero = read(
    "src/components/domain/events/public/PublicHomeHero.tsx",
  );
  assert.match(hero, /href="\/login"/);
  assert.match(hero, /웹에서 시작하기/);
  assert.match(hero, /PublicManagerDownloadButton/);
  assert.match(hero, /PublicHomeProductVisual/);

  const nav = read("src/components/layout/PublicNav.tsx");
  assert.match(nav, /\/#features/);
  assert.match(nav, /\/#manager/);
  assert.match(nav, /MatchonLogo/);
  assert.doesNotMatch(nav, /html\.desktop-app|desktop-app-viewport/);

  const layout = read("src/lib/ui/desktop-app-layout.ts");
  assert.match(layout, /DESKTOP_APP_HTML_CLASS|desktop-app/);

  console.log("verify:landing-routes OK");
}

main();
