/**
 * 공개 대회 공고 = Event SSOT (Announcement 모델 없음) 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const schema = read("prisma/schema.prisma");
assert.equal(schema.includes("model Announcement"), false);
assert.match(schema, /model Event \{/);

const home = read("src/app/(public)/page.tsx");
assert.match(home, /eventService\.listPublicEvents\(\)/);

const publicList = read("src/app/(public)/events/page.tsx");
assert.match(publicList, /eventService\.listPublicEvents\(\)/);

const visibility = read("src/lib/events/public-event-visibility.ts");
assert.match(visibility, /PUBLIC_EVENT_EXCLUDED_STATUSES/);
assert.match(visibility, /isEphemeralPublicAnnouncementSlug/);
assert.match(visibility, /shouldListEventOnPublicAnnouncementBoard/);

const repo = read("src/lib/repositories/event.repository.ts");
assert.match(repo, /PUBLIC_EVENT_EXCLUDED_STATUSES/);
assert.match(repo, /isEphemeralPublicAnnouncementSlug/);
assert.match(repo, /startsWith: "e2e-"/);
assert.doesNotMatch(repo, /SAMPLE_EVENTS|mockEvents|fallbackEvents/);

const service = read("src/lib/services/event.service.ts");
assert.match(service, /async listPublicEvents/);
assert.doesNotMatch(service, /mockEvents|staticEvents|fixtureEvents/);

console.log("verify:public-announcement-ssot: OK");
