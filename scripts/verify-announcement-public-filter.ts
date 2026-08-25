/**
 * 공개 공고 필터 SSOT + E2E fixture 제외 검증.
 */
import assert from "node:assert/strict";
import {
  isEphemeralPublicAnnouncementSlug,
  isEventStatusPubliclyListed,
  shouldListEventOnPublicAnnouncementBoard,
} from "../src/lib/events/public-event-visibility";

assert.equal(isEventStatusPubliclyListed("draft"), false);
assert.equal(isEventStatusPubliclyListed("cancelled"), false);
assert.equal(isEventStatusPubliclyListed("open"), true);
assert.equal(isEventStatusPubliclyListed("closed"), true);
assert.equal(isEventStatusPubliclyListed("finished"), true);

assert.equal(isEphemeralPublicAnnouncementSlug("e2e-1781337731194-slug"), true);
assert.equal(isEphemeralPublicAnnouncementSlug("sample-open-2026"), false);
assert.equal(isEphemeralPublicAnnouncementSlug("event-9f30c140"), false);

assert.equal(
  shouldListEventOnPublicAnnouncementBoard({
    status: "open",
    publicSlug: "sample-open-2026",
  }),
  true,
);
assert.equal(
  shouldListEventOnPublicAnnouncementBoard({
    status: "open",
    publicSlug: "e2e-1781337731194-slug",
  }),
  false,
);
assert.equal(
  shouldListEventOnPublicAnnouncementBoard({
    status: "draft",
    publicSlug: "sample-open-2026",
  }),
  false,
);

const actions = require("node:fs").readFileSync(
  require("node:path").join(
    process.cwd(),
    "src/features/events/actions.ts",
  ),
  "utf8",
);
assert.match(actions, /revalidatePublicAnnouncementPaths/);
assert.match(actions, /revalidatePath\("\/events"\)/);
assert.match(actions, /revalidatePath\("\/"\)/);

console.log("verify:announcement-public-filter: OK");
console.log("verify:no-public-announcement-fixture: OK");
