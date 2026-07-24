/**
 * Gym fighter edit / event card / weigh-in hide / bracket nav verifies.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gymFighterFormInitialFromEdit } from "../src/lib/fighters/gym-fighter-form-initial";
import { FighterStatus } from "../src/lib/enums";
import { resolveGymEventCardActions } from "../src/lib/ui/gym-event-card-actions";
import {
  getGymPortalNavGroups,
  getGymPortalNavItems,
} from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertFighterEditPage() {
  const page = read(
    "src/app/(dashboard)/gym/fighters/[fighterId]/edit/page.tsx",
  );
  assert.match(
    page,
    /from "@\/lib\/fighters\/gym-fighter-form-initial"/,
    "edit page must import server-safe mapper",
  );
  assert.doesNotMatch(
    page,
    /gymFighterFormInitialFromEdit,\s*\n?\s*\} from "@\/components\/domain\/fighters\/GymFighterForm"/,
  );

  const form = read("src/components/domain/fighters/GymFighterForm.tsx");
  assert.match(form, /^"use client";/m);
  assert.match(
    form,
    /export \{ gymFighterFormInitialFromEdit \} from "@\/lib\/fighters\/gym-fighter-form-initial"/,
  );

  const initial = gymFighterFormInitialFromEdit({
    name: "테스트",
    birthDate: new Date(Date.UTC(2000, 0, 15)),
    gender: "male",
    phone: null,
    height: null,
    weight: null,
    primarySport: null,
    guardianName: null,
    guardianPhone: null,
    gymInternalMemo: null,
    status: FighterStatus.active,
  });
  assert.equal(initial.birthDate, "2000-01-15");
  assert.equal(initial.phone, "");
  assert.equal(initial.height, "");

  const legacy = gymFighterFormInitialFromEdit({
    name: "레거시",
    birthDate: null,
    gender: null,
    phone: null,
    height: null,
    weight: null,
    primarySport: null,
    guardianName: null,
    guardianPhone: null,
    gymInternalMemo: null,
    status: FighterStatus.inactive,
  });
  assert.equal(legacy.birthDate, "");
  assert.equal(legacy.gender, "");

  console.log("verify:gym-fighter-edit-page: OK");
  console.log("verify:gym-fighter-edit-legacy-data: OK");
}

function assertEventCardSsot() {
  const ui = read(
    "src/components/domain/events/announcement/event-announcement-card-ui.ts",
  );
  assert.match(ui, /eventAnnouncementCardListWidthClass/);
  assert.match(ui, /max-w-\[1120px\]/);
  assert.match(ui, /px-4 sm:px-6 lg:px-8/);
  assert.match(ui, /eventAnnouncementCardPosterSizesDesktop/);

  const gymPage = read("src/app/(dashboard)/gym/events/page.tsx");
  assert.match(gymPage, /eventAnnouncementCardListWidthClass/);
  assert.match(gymPage, /eventAnnouncementCardGridClass/);

  const gymCard = read("src/components/domain/events/GymEventCard.tsx");
  assert.match(gymCard, /eventAnnouncementCardPosterSizesDesktop/);
  assert.match(
    gymCard,
    /from "@\/components\/domain\/events\/announcement\/EventAnnouncementCard"/,
  );

  const publicDesktop = read(
    "src/components/domain/events/public/PublicEventCardDesktop.tsx",
  );
  assert.match(publicDesktop, /EventAnnouncementCard/);
  assert.match(publicDesktop, /posterSizes=/);

  console.log("verify:gym-event-card-size-ssot: OK");
  console.log("verify:gym-event-card-public-parity: OK");
}

function assertWeighInHidden() {
  const nav = getGymPortalNavItems();
  assert.ok(!nav.some((i) => i.label.includes("계체")));
  assert.ok(!nav.some((i) => i.href.includes("field-status")));

  const actions = read("src/lib/ui/gym-event-card-actions.ts");
  assert.doesNotMatch(actions, /fieldStatusLink/);
  assert.doesNotMatch(actions, /\/gym\/events\/\$\{event\.id\}\/field-status/);
  assert.doesNotMatch(actions, /현장\/계체 상태/);
  assert.match(actions, /bracketLink/);

  const header = read("src/components/domain/gyms/GymEventSubpageHeader.tsx");
  assert.doesNotMatch(header, /현장·계체 상태/);
  assert.doesNotMatch(header, /\/field-status/);
  assert.match(header, /대진표 확인/);

  const fieldPage = read(
    "src/app/(dashboard)/gym/events/[eventId]/field-status/page.tsx",
  );
  assert.match(fieldPage, /redirect\(`\/gym\/events\/\$\{eventId\}\/status`\)/);

  const organizerCheckIn = read(
    "src/app/(dashboard)/organizer/events/[eventId]/check-in/page.tsx",
  );
  assert.match(organizerCheckIn, /fieldStatusService|OrganizerFieldStatusBoard/);

  const plan = resolveGymEventCardActions({
    id: "e1",
    publicSlug: "slug",
    canApply: false,
    gymApplicationCount: 2,
    registrationStatus: "closed",
    registrationStatusLabel: "신청 마감",
    status: "open",
    hasPublicBrackets: true,
  });
  assert.equal(plan.bracketLink?.label, "대진표 확인");
  assert.ok(!("fieldStatusLink" in plan));

  console.log("verify:gym-weigh-in-hidden: OK");
}

function assertBracketNavAndReadOnly() {
  const groups = getGymPortalNavGroups();
  const events = groups.find((g) => g.id === "events");
  assert.deepEqual(
    events?.items.map((i) => ({ href: i.href, label: i.label })),
    [
      { href: "/gym/events", label: "대회 목록" },
      { href: "/gym/applications", label: "신청 내역" },
      { href: "/gym/brackets", label: "대진표 확인" },
    ],
  );

  const page = read("src/app/(dashboard)/gym/brackets/page.tsx");
  assert.match(page, /대진표 확인/);
  assert.match(page, /listGymBracketBoard/);
  assert.match(page, /공개된 대진표/);
  assert.doesNotMatch(page, /createBracket|updateBracket|deleteBracket/);
  assert.doesNotMatch(page, /weighIn|check-in|field-status/);

  const service = read("src/lib/services/gym-event-status.service.ts");
  assert.match(service, /listGymBracketBoard/);
  assert.match(service, /publicMatches/);
  assert.match(service, /hasPublicBrackets/);

  const appsTable = read(
    "src/components/domain/applications/GymApplicationsTable.tsx",
  );
  assert.match(appsTable, /\/gym\/brackets\?eventId=/);
  assert.match(appsTable, /대진표 확인/);

  console.log("verify:gym-bracket-navigation: OK");
  console.log("verify:gym-bracket-read-only: OK");
  console.log("verify:gym-bracket-permissions: OK");
  console.log("verify:gym-bracket-application-link: OK");
}

function main() {
  assertFighterEditPage();
  assertEventCardSsot();
  assertWeighInHidden();
  assertBracketNavAndReadOnly();
  console.log("ALL verify:gym-fighter-edit-events-brackets OK");
}

main();
