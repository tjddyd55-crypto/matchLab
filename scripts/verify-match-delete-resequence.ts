/**
 * 경기 삭제 후 courtOrder + event-wide matchNumber 연속성
 *   npm run verify:match-delete-resequence
 *
 * 화면 「N경기」SSOT = matchNumber (formatCourtScheduleMatchOrderShort).
 * deleteBracketMatch는 matchOrder + courtOrder + matchNumber 재정렬을 함께 해야 한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatCourtScheduleMatchOrderShort,
  renumberAllCourtOrders,
  renumberEventWideMatchNumbers,
} from "../src/lib/court-match-order";

function assertContiguous(orders: Array<number | null>, label: string) {
  const nums = orders.filter((n): n is number => n != null).sort((a, b) => a - b);
  assert.equal(new Set(nums).size, nums.length, `${label}: duplicate courtOrder`);
  for (let i = 0; i < nums.length; i++) {
    assert.equal(nums[i], i + 1, `${label}: expected ${i + 1}, got ${nums[i]}`);
  }
}

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  assert.match(service, /deleteBracketMatch/);
  assert.match(service, /renumberAllCourtOrders/);
  assert.match(service, /applyEventWideMatchNumberResequence/);
  assert.match(service, /courtOrdersRenumbered/);
  const deleteFn = service.slice(service.indexOf("async deleteBracketMatch"));
  const nextMethod = deleteFn.search(/\n  async [a-zA-Z]/);
  const deleteBody =
    nextMethod > 0 ? deleteFn.slice(0, nextMethod) : deleteFn.slice(0, 8000);
  assert.match(deleteBody, /renumberAllCourtOrders/);
  assert.match(deleteBody, /updateMatchCourt/);
  assert.match(deleteBody, /deletedCourtId/);
  assert.match(deleteBody, /applyEventWideMatchNumberResequence/);
  assert.match(deleteBody, /timeout:\s*30_000/);

  const afterMiddleDelete = renumberAllCourtOrders([
    { matchId: "a", courtId: "c1", courtOrder: 1 },
    { matchId: "b", courtId: "c1", courtOrder: 2 },
    { matchId: "d", courtId: "c1", courtOrder: 4 },
    { matchId: "e", courtId: "c1", courtOrder: 5 },
  ]);
  assert.deepEqual(
    afterMiddleDelete.map((u) => [u.matchId, u.courtOrder]),
    [
      ["a", 1],
      ["b", 2],
      ["d", 3],
      ["e", 4],
    ],
  );
  assertContiguous(
    afterMiddleDelete.map((u) => u.courtOrder),
    "middle-delete",
  );

  const eventWide = renumberEventWideMatchNumbers(
    [
      { matchId: "m29", courtId: "c1", courtOrder: 29, matchNumber: 29 },
      { matchId: "m31", courtId: "c1", courtOrder: 31, matchNumber: 31 },
    ],
    [{ id: "c1", sortOrder: 0 }],
  );
  assert.deepEqual(
    eventWide.map((u) => [u.matchId, u.matchNumber]),
    [
      ["m29", 1],
      ["m31", 2],
    ],
  );
  assert.equal(
    formatCourtScheduleMatchOrderShort({
      matchId: "m31",
      courtId: "c1",
      courtOrder: 2,
      matchNumber: 2,
      globalMatchOrder: null,
      matchOrder: 0,
    }),
    "2경기",
  );

  const afterTwoDeletes = renumberAllCourtOrders(
    [1, 2, 3, 5, 6, 8, 9, 10].map((n) => ({
      matchId: `m${n}`,
      courtId: "c1",
      courtOrder: n,
    })),
  );
  assert.equal(afterTwoDeletes.length, 8);
  assertContiguous(
    afterTwoDeletes.map((u) => u.courtOrder),
    "two-middle-deletes",
  );

  const afterLast = renumberAllCourtOrders(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
      matchId: `m${n}`,
      courtId: "c1",
      courtOrder: n,
    })),
  );
  assert.deepEqual(
    afterLast.map((u) => u.courtOrder),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );

  const multiCourt = renumberAllCourtOrders([
    { matchId: "a1", courtId: "c1", courtOrder: 1 },
    { matchId: "a3", courtId: "c1", courtOrder: 3 },
    { matchId: "b2", courtId: "c2", courtOrder: 2 },
    { matchId: "b5", courtId: "c2", courtOrder: 5 },
    { matchId: "u", courtId: null, courtOrder: 99 },
  ]);
  const c1 = multiCourt.filter((u) => u.courtId === "c1");
  const c2 = multiCourt.filter((u) => u.courtId === "c2");
  const un = multiCourt.filter((u) => u.courtId == null);
  assertContiguous(c1.map((u) => u.courtOrder), "c1");
  assertContiguous(c2.map((u) => u.courtOrder), "c2");
  assert.deepEqual(un.map((u) => u.courtOrder), [null]);

  console.log("verify:match-delete-resequence OK");
}

main();
