/**
 * Landing responsive: no desktop-app CSS pollution + overflow guards.
 *   npm run verify:landing-no-horizontal-overflow
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const files = [
    "src/components/domain/events/public/PublicHomeHero.tsx",
    "src/components/domain/events/public/PublicHomeFeaturesSection.tsx",
    "src/components/domain/events/public/PublicHomeGymSection.tsx",
    "src/components/domain/events/public/PublicHomeAudienceSection.tsx",
    "src/components/domain/events/public/PublicHomeManagerDownloadSection.tsx",
    "src/components/domain/events/public/PublicHomeOrganizerCtaSection.tsx",
    "src/components/layout/PublicShell.tsx",
    "src/components/layout/PublicNav.tsx",
  ];

  for (const rel of files) {
    const src = read(rel);
    assert.doesNotMatch(
      src,
      /desktop-app-viewport|desktop-app-canvas|html\.desktop-app/,
      `${rel} must not use Desktop Manager canvas CSS`,
    );
    assert.doesNotMatch(
      src,
      /min-w-\[\d{4,}px\]|w-\[\d{4,}px\]/,
      `${rel} must not force oversized fixed widths`,
    );
  }

  const hero = read("src/components/domain/events/public/PublicHomeHero.tsx");
  assert.match(hero, /flex-col/);
  assert.match(hero, /sm:flex-row|lg:grid-cols/);
  assert.match(hero, /min-w-0/);

  const container = read(
    "src/components/domain/events/public/public-event-layout.ts",
  );
  assert.match(container, /max-w-\[1200px\]/);

  console.log("verify:landing-no-horizontal-overflow OK");
}

main();
