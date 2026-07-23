/**
 * 공개(/events) · 체육관(/gym/events) 대회 공고 카드 SSOT 검증.
 *   npm run verify:shared-event-announcement-card
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGymEventCardActions } from "../src/lib/ui/gym-event-card-actions";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSharedCardWiring() {
  const announcement = read(
    "src/components/domain/events/announcement/EventAnnouncementCard.tsx",
  );
  assert.match(
    announcement,
    /공개·체육관 대회 공고 카드 SSOT/,
    "EventAnnouncementCard must declare SSOT role",
  );

  const gymCard = read("src/components/domain/events/GymEventCard.tsx");
  assert.match(
    gymCard,
    /from "@\/components\/domain\/events\/announcement\/EventAnnouncementCard"/,
  );
  assert.match(gymCard, /GymEventCardActions/);
  assert.match(gymCard, /GymEventApplicationSummary/);
  assert.doesNotMatch(
    gymCard,
    /EventPosterImage/,
    "Gym card must not reimplement poster",
  );

  const publicDesktop = read(
    "src/components/domain/events/public/PublicEventCardDesktop.tsx",
  );
  const publicMobile = read(
    "src/components/domain/events/public/PublicEventCardMobile.tsx",
  );
  for (const src of [publicDesktop, publicMobile]) {
    assert.match(
      src,
      /from "@\/components\/domain\/events\/announcement\/EventAnnouncementCard"/,
    );
    assert.doesNotMatch(
      src,
      /GymEventCardActions|gymApplicationCount|우리 체육관 신청/,
      "Public cards must not expose gym-only UI",
    );
  }

  const gymPage = read("src/app/(dashboard)/gym/events/page.tsx");
  assert.match(gymPage, /GymEventCard/);
  assert.match(gymPage, /eventAnnouncementCardGridClass/);

  const service = read("src/lib/services/event.service.ts");
  assert.match(service, /coverImageUrl: resolveEventCoverImageUrl/);
  assert.match(service, /registrationStatus: registrationDisplay\.registrationStatus/);
  assert.match(service, /hasPublicBrackets: bracketIds\.has\(row\.id\)/);

  const repo = read("src/lib/repositories/event.repository.ts");
  assert.match(repo, /gymDashboardListSelect/);
  assert.match(repo, /\.\.\.listSelect/);

  console.log("verify:shared-event-announcement-card: wiring OK");
}

function assertGymActionsPlan() {
  const base = {
    id: "e1",
    publicSlug: "slug-1",
    registrationStatus: "open" as const,
    registrationStatusLabel: "신청 가능",
    status: "open" as const,
  };

  const applyFirst = resolveGymEventCardActions({
    ...base,
    canApply: true,
    gymApplicationCount: 0,
  });
  assert.equal(applyFirst.primary?.label, "선수 신청하기");
  assert.equal(applyFirst.secondary?.label, "공개 공고 보기");
  assert.equal(applyFirst.fieldStatusLink, null);

  const withApps = resolveGymEventCardActions({
    ...base,
    canApply: true,
    gymApplicationCount: 2,
  });
  assert.equal(withApps.primary?.label, "신청 현황");
  assert.equal(withApps.secondary?.label, "선수 추가 신청");
  assert.equal(withApps.textLink?.label, "공개 공고 보기");
  assert.equal(withApps.fieldStatusLink?.label, "현장/계체 상태");

  const closedWithApps = resolveGymEventCardActions({
    ...base,
    canApply: false,
    registrationStatus: "closed",
    gymApplicationCount: 1,
  });
  assert.equal(closedWithApps.primary?.label, "신청 현황");
  assert.equal(closedWithApps.fieldStatusLink?.label, "현장/계체 상태");

  const closedNoApps = resolveGymEventCardActions({
    ...base,
    canApply: false,
    registrationStatus: "closed",
    gymApplicationCount: 0,
  });
  assert.equal(closedNoApps.primary, null);
  assert.equal(closedNoApps.disabledPrimaryLabel, "신청 마감");
  assert.equal(closedNoApps.fieldStatusLink, null);

  console.log("verify:shared-event-announcement-card: actions OK");
}

function main() {
  assertSharedCardWiring();
  assertGymActionsPlan();
  console.log("verify:shared-event-announcement-card: ALL_PASS");
}

main();
