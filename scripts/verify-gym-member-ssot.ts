/**
 * GymMember SSOT / fighter link / expiration / navigation static verifies.
 *   npm run verify:gym-member-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeGymMemberMembershipStatus,
  getGymMemberExpirationDisplay,
  getGymMemberMembershipStatusLabel,
  daysUntilEndsAt,
} from "../src/lib/gym-member-membership-status";
import { formatWon, parseWonInput } from "../src/lib/format-won";
import {
  getGymPortalNavGroups,
  getGymPortalNavItems,
  getGymPortalMobileBottomNavItems,
  GYM_PORTAL_HIDDEN_EVENT_HREFS,
} from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function assertExpiration() {
  const today = new Date(Date.UTC(2026, 6, 21)); // 2026-07-21
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "withdrawn",
      endsAt: "2026-08-01",
      todayUtc: today,
    }),
    "withdrawn",
  );
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "paused",
      endsAt: "2026-08-01",
      todayUtc: today,
    }),
    "paused",
  );
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "active",
      endsAt: null,
      todayUtc: today,
    }),
    "no_plan",
  );
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "active",
      endsAt: "2026-07-15",
      todayUtc: today,
    }),
    "expired",
  );
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "active",
      endsAt: "2026-07-25",
      todayUtc: today,
    }),
    "expiring",
  );
  assert.equal(
    computeGymMemberMembershipStatus({
      memberStatus: "active",
      endsAt: "2026-08-30",
      todayUtc: today,
    }),
    "active",
  );
  assert.equal(daysUntilEndsAt("2026-07-28", today), 7);
  assert.equal(getGymMemberExpirationDisplay("2026-07-21", today), "오늘 만료");
  assert.equal(
    getGymMemberMembershipStatusLabel("expiring"),
    "만료 예정",
  );
  console.log("verify:gym-member-expiration-status: OK");
}

function assertFormatWon() {
  assert.equal(formatWon(150000), "150,000원");
  assert.equal(parseWonInput("150,000"), 150000);
  assert.equal(parseWonInput("-1"), 1);
  console.log("verify:gym-member-payment-format: OK");
}

function assertNav() {
  const items = getGymPortalNavItems();
  const hrefs = items.map((i) => i.href);
  assert.ok(hrefs.includes("/gym/members"));
  assert.ok(hrefs.includes("/gym/membership-plans"));
  assert.ok(hrefs.includes("/gym/fighters"));
  assert.ok(hrefs.includes("/gym/events"));
  assert.ok(hrefs.includes("/gym/applications"));
  for (const h of GYM_PORTAL_HIDDEN_EVENT_HREFS) {
    assert.ok(!hrefs.includes(h));
  }
  const groups = getGymPortalNavGroups();
  assert.ok(groups.some((g) => g.id === "members" && g.label === "회원 관리"));
  assert.ok(groups.some((g) => g.id === "events" && g.label === "대회"));
  const bottom = getGymPortalMobileBottomNavItems();
  assert.deepEqual(
    bottom.map((i) => i.label),
    ["홈", "회원", "선수", "더보기"],
  );
  console.log("verify:gym-member-navigation: OK");
}

function assertSchemaAndCode() {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /model GymMember/);
  assert.match(schema, /model GymMembershipPlan/);
  assert.match(schema, /model GymMemberSubscription/);
  assert.match(schema, /model GymMemberSubscriptionPause/);
  assert.match(schema, /model GymMemberPayment/);
  assert.match(schema, /gymMemberId\s+String\?\s+@unique/);
  assert.doesNotMatch(schema, /fighterId\s+String\?\s+@unique\s*\n\s*fighter/);
  assert.match(schema, /gym_member_created/);

  const service = readFileSync(
    join(root, "src/lib/services/gym-member.service.ts"),
    "utf8",
  );
  assert.match(service, /requireGymPortalWrite/);
  assert.match(service, /confirmDuplicate/);
  assert.match(service, /registerAsFighter/);
  assert.match(service, /promoteToFighter/);
  assert.match(service, /syncFighterBasicFromMember|guardianName/);

  const fighterSvc = readFileSync(
    join(root, "src/lib/services/fighter.service.ts"),
    "utf8",
  );
  assert.match(fighterSvc, /gymMemberId: member\.id/);
  assert.match(fighterSvc, /gymMemberRepository\.create/);

  const fightersNew = readFileSync(
    join(root, "src/app/(dashboard)/gym/fighters/new/page.tsx"),
    "utf8",
  );
  assert.match(fightersNew, /listPromotableMembers/);
  assert.match(fightersNew, /GymFighterPromoteFromMember/);

  console.log("verify:gym-member-is-person-ssot: OK");
  console.log("verify:gym-member-fighter-one-to-one: OK");
  console.log("verify:no-duplicate-member-on-fighter-create: OK");
}

function assertAccessGuards() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-member.service.ts"),
    "utf8",
  );
  assert.match(service, /assertMemberOwned|findByIdForGym/);
  assert.match(service, /requireGymPortalRead/);
  assert.doesNotMatch(service, /role === \"organizer\"/);

  const actions = readFileSync(
    join(root, "src/features/gym-members/actions.ts"),
    "utf8",
  );
  assert.match(actions, /requireActorFromMutation/);
  assert.match(actions, /createGymMemberAction/);

  console.log("verify:gym-member-access: OK");
}

function assertCountIncludesFighters() {
  const home = readFileSync(
    join(root, "src/app/(dashboard)/gym/page.tsx"),
    "utf8",
  );
  assert.match(home, /getSummary|withFighter|withoutFighter/);
  assert.match(home, /전체 회원|일반 회원|선수/);
  console.log("verify:gym-member-count-includes-fighters: OK");
}

function assertBackfillScript() {
  const script = readFileSync(
    join(root, "scripts/backfill-gym-members-from-fighters.ts"),
    "utf8",
  );
  assert.match(script, /gymMemberId/);
  assert.match(script, /multiple_phone_matches|ambiguous/);
  assert.match(script, /DRY_RUN/);
  console.log("verify:legacy-fighter-member-backfill: OK");
}

assertExpiration();
assertFormatWon();
assertNav();
assertSchemaAndCode();
assertAccessGuards();
assertCountIncludesFighters();
assertBackfillScript();
console.log("verify:gym-member-ssot: ALL_PASS");
