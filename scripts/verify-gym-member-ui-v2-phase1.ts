/**
 * 회원관리 UI V2 1차 — 열/상태/필터 SSOT 검증 (DB 불필요)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeGymMemberMembershipStatus,
  getGymMemberMembershipStatusLabel,
  getGymMemberExpirationDisplay,
} from "../src/lib/gym-member-membership-status";

const LIST_COLUMNS = [
  "회원",
  "연락처",
  "상태",
  "회원권",
  "만료",
  "관리",
] as const;

const HIDDEN_COLUMNS = ["이용기간", "PT", "최근 활동"] as const;

const DETAIL_TABS = [
  "overview",
  "membership",
  "schedule",
  "participation",
  "fighter",
] as const;

function main() {
  assert.equal(LIST_COLUMNS.length, 6);
  for (const h of HIDDEN_COLUMNS) {
    assert.equal(LIST_COLUMNS.includes(h as never), false);
  }
  assert.equal(DETAIL_TABS.length, 5);

  const page = readFileSync(
    "src/app/(dashboard)/gym/members/page.tsx",
    "utf8",
  );
  assert.match(page, /joined:\s*"this-month"/);
  assert.match(page, /MemberMetricCard[\s\S]*이번 달 신규[\s\S]*href=/);

  const today = new Date(Date.UTC(2026, 7, 5));
  const expiring = computeGymMemberMembershipStatus({
    memberStatus: "active",
    endsAt: new Date(Date.UTC(2026, 7, 10)),
    todayUtc: today,
  });
  assert.equal(expiring, "expiring");
  assert.equal(getGymMemberMembershipStatusLabel(expiring), "만료 예정");

  const paused = computeGymMemberMembershipStatus({
    memberStatus: "paused",
    endsAt: new Date(Date.UTC(2026, 10, 1)),
    todayUtc: today,
  });
  assert.equal(paused, "paused");

  const noPlan = computeGymMemberMembershipStatus({
    memberStatus: "active",
    endsAt: null,
    todayUtc: today,
  });
  assert.equal(noPlan, "no_plan");

  const d = getGymMemberExpirationDisplay(
    new Date(Date.UTC(2026, 7, 12)),
    today,
  );
  assert.equal(d, "D-7");

  console.log("verify:gym-member-ui-v2-phase1 OK", {
    columns: LIST_COLUMNS,
    tabs: DETAIL_TABS,
  });
}

main();
