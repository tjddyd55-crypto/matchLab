/**
 * 경기 순서 변경 시 courtOrder + matchNumber(표시 SSOT) 동시 재부여 검증
 *   npx tsx scripts/verify-match-schedule-renumber.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clampCourtReorderPosition,
  computeCourtOrderUpdates,
  formatCourtScheduleMatchOrderShort,
  renumberEventWideMatchNumbersByCourtSchedule,
} from "../src/lib/court-match-order";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/event-court.service.ts"),
    "utf8",
  );
  assert.match(service, /applyMatchNumbersByCourtSchedule/);
  assert.match(service, /renumberEventWideMatchNumbersByCourtSchedule/);
  assert.match(service, /async updateMatchSchedule/);
  const updateFn = service.slice(service.indexOf("async updateMatchSchedule"));
  const nextMethod = updateFn.search(/\n  async [a-zA-Z]/);
  const updateBody =
    nextMethod > 0 ? updateFn.slice(0, nextMethod) : updateFn.slice(0, 4000);
  assert.match(updateBody, /applyMatchNumbersByCourtSchedule/);

  const courts = [
    { id: "c1", sortOrder: 1 },
    { id: "c2", sortOrder: 2 },
  ];

  // 같은 경기장에서 10→3 이동 후 matchNumber가 진행순서로 재부여
  const before = [
    { matchId: "m1", courtId: "c1", courtOrder: 1 },
    { matchId: "m2", courtId: "c1", courtOrder: 2 },
    { matchId: "m3", courtId: "c1", courtOrder: 3 },
    { matchId: "m4", courtId: "c1", courtOrder: 4 },
    { matchId: "m5", courtId: "c1", courtOrder: 5 },
    { matchId: "m6", courtId: "c1", courtOrder: 6 },
    { matchId: "m7", courtId: "c1", courtOrder: 7 },
    { matchId: "m8", courtId: "c1", courtOrder: 8 },
    { matchId: "m9", courtId: "c1", courtOrder: 9 },
    { matchId: "m10", courtId: "c1", courtOrder: 10 },
  ];

  const courtUpdates = computeCourtOrderUpdates({
    allMatches: before,
    movingMatchId: "m10",
    targetCourtId: "c1",
    targetPosition: 3,
  });
  const byId = new Map(before.map((m) => [m.matchId, { ...m }]));
  for (const u of courtUpdates) {
    byId.set(u.matchId, {
      matchId: u.matchId,
      courtId: u.courtId,
      courtOrder: u.courtOrder,
    });
  }
  const afterCourt = [...byId.values()];
  assert.equal(
    afterCourt.find((m) => m.matchId === "m10")?.courtOrder,
    3,
    "m10 should be courtOrder 3",
  );
  assert.equal(
    afterCourt.find((m) => m.matchId === "m3")?.courtOrder,
    4,
    "previous 3 should shift to 4",
  );

  const numbers = renumberEventWideMatchNumbersByCourtSchedule(
    afterCourt,
    courts,
  );
  const numberById = new Map(numbers.map((n) => [n.matchId, n.matchNumber]));
  assert.equal(numberById.get("m1"), 1);
  assert.equal(numberById.get("m2"), 2);
  assert.equal(numberById.get("m10"), 3);
  assert.equal(numberById.get("m3"), 4);
  assert.equal(numberById.get("m9"), 10);

  // 표시 라벨은 matchNumber SSOT
  assert.equal(
    formatCourtScheduleMatchOrderShort({
      matchId: "m10",
      courtId: "c1",
      courtOrder: 3,
      matchNumber: 3,
    }),
    "3경기",
  );

  assert.equal(clampCourtReorderPosition(0, 10), 1);
  assert.equal(clampCourtReorderPosition(30, 10), 10);
  assert.equal(clampCourtReorderPosition(3, 10), 3);

  // 카드만 바뀌고 번호가 꼬이던 케이스: 8/10/9 → schedule renumber → 8/9/10
  const swapped = [
    { matchId: "a", courtId: "c1", courtOrder: 1 },
    { matchId: "c", courtId: "c1", courtOrder: 2 },
    { matchId: "b", courtId: "c1", courtOrder: 3 },
  ];
  const prefixCourt = { id: "c0", sortOrder: 0 };
  const withPrefixFixed = [
    ...Array.from({ length: 7 }, (_, i) => ({
      matchId: `p${i + 1}`,
      courtId: "c0",
      courtOrder: i + 1,
    })),
    ...swapped,
  ];
  const renumbered = renumberEventWideMatchNumbersByCourtSchedule(
    withPrefixFixed,
    [prefixCourt, ...courts],
  );
  const labels = renumbered
    .filter((n) => ["a", "c", "b"].includes(n.matchId))
    .sort((x, y) => x.matchNumber - y.matchNumber)
    .map((n) => n.matchNumber);
  assert.deepEqual(labels, [8, 9, 10]);

  console.log("verify-match-schedule-renumber: ok");
}

main();
