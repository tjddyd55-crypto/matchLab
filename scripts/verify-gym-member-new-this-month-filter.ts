/**
 * 이번 달 신규 필터 — joinedAt / Seoul 월 경계 / URL SSOT (DB 불필요)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSeoulCurrentMonthRange } from "../src/lib/gym-attendance/seoul-date";

function main() {
  const page = readFileSync(
    "src/app/(dashboard)/gym/members/page.tsx",
    "utf8",
  );
  assert.match(page, /joined:\s*"this-month"/);
  assert.match(page, /parseJoined/);
  assert.match(page, /joinedFilter/);

  const filterBar = readFileSync(
    "src/components/domain/gym-members/MemberFilterBar.tsx",
    "utf8",
  );
  assert.match(filterBar, /joined === "this-month"/);
  assert.match(filterBar, /sp\.set\("joined"/);

  const repo = readFileSync(
    "src/lib/repositories/gym-member.repository.ts",
    "utf8",
  );
  assert.match(repo, /gymMemberJoinedThisMonthFilter/);
  assert.match(repo, /joinedFilter === "this-month"/);
  assert.match(repo, /getSeoulCurrentMonthRange/);

  const at = new Date(Date.UTC(2026, 7, 15, 12, 0, 0));
  const range = getSeoulCurrentMonthRange(at);
  assert.equal(range.start.toISOString().slice(0, 10), "2026-08-01");
  assert.equal(range.endExclusive.toISOString().slice(0, 10), "2026-09-01");

  console.log("verify:gym-member-new-this-month-filter OK", {
    query: "joined=this-month",
    field: "joinedAt",
    rangeStart: "2026-08-01",
    rangeEndExclusive: "2026-09-01",
  });
}

main();
