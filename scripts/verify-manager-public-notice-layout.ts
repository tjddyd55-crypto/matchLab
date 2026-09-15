/**
 * Manager 공개 공고 — shell 내부 preview route 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const nav = read("src/lib/ui/event-management-navigation.ts");
assert.match(nav, /getEventPublicNoticeManagerPath/);
assert.match(nav, /\/public-notice/);
assert.doesNotMatch(
  nav,
  /label: "공개 공고"[\s\S]*?external: true/,
  "공개 공고 nav must not open external standalone page",
);

const sideNav = read("src/components/domain/events/EventManagementSideNavContent.tsx");
assert.doesNotMatch(
  sideNav,
  /공개 공고[\s\S]*target=\{item\.external \? "_blank"/,
);

const page = read(
  "src/app/(dashboard)/organizer/events/[eventId]/public-notice/page.tsx",
);
assert.match(page, /EventManagementLayout/);
assert.match(page, /PublicEventAnnouncementContent/);
assert.match(page, /OrganizerPublicNoticeLinkActions/);
assert.doesNotMatch(page, /PublicNav/);

const shared = read(
  "src/components/domain/events/public/PublicEventAnnouncementContent.tsx",
);
assert.match(shared, /PublicEventDetailHero/);
assert.match(shared, /PublicEventOverviewSection/);

const publicPage = read("src/app/(public)/events/[slug]/page.tsx");
assert.match(publicPage, /PublicEventDetailShell/);

console.log("verify:manager-public-notice-layout: OK");
