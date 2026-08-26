/**
 * 경기 삭제 후 courtOrder 연속성
 *   npm run verify:match-delete-resequence
 *
 * 화면 「N경기」SSOT = courtOrder (formatCourtScheduleMatchOrderShort).
 * deleteBracketMatch는 matchOrder + courtOrder 재정렬을 함께 해야 한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatCourtScheduleMatchOrderShort,
  renumberAllCourtOrders,
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
  assert.match(service, /courtOrdersRenumbered/);
  const deleteFn = service.slice(service.indexOf("async deleteBracketMatch"));
  const nextMethod = deleteFn.search(/\n  async [a-zA-Z]/);
  const deleteBody =
    nextMethod > 0 ? deleteFn.slice(0, nextMethod) : deleteFn.slice(0, 8000);
  assert.match(deleteBody, /renumberAllCourtOrders/);
  assert.match(deleteBody, /updateMatchCourt/);
  assert.match(deleteBody, /deletedCourtId/);
  assert.match(deleteBody, /timeout:\s*30_000/);

  // A. 1..5 중 3 삭제 → 1..4
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

  // B. 29,31 gap (실제 장애 형태) → 29,30 연속(1,2로 재부여)
  const afterGap = renumberAllCourtOrders([
    { matchId: "m29", courtId: "c1", courtOrder: 29 },
    { matchId: "m31", courtId: "c1", courtOrder: 31 },
  ]);
  assert.deepEqual(
    afterGap.map((u) => [u.matchId, u.courtOrder]),
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
      matchNumber: null,
      globalMatchOrder: null,
      matchOrder: 0,
    }),
    "2경기",
  );

  // C. 중간 2회 삭제 (1..10에서 4,7 제거) → 1..8
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

  // D. 마지막 삭제: 1..9 유지, side effect 없음
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

  // E. 경기장별 독립 + 미배정 null 유지
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
  assert.deepEqual(
    c1.map((u) => u.courtOrder),
    [1, 2],
  );
  assert.deepEqual(
    c2.map((u) => u.courtOrder),
    [1, 2],
  );
  assert.deepEqual(un.map((u) => u.courtOrder), [null]);

  // F. Match.id 불변 — renumber는 matchId를 바꾸지 않음
  assert.ok(afterGap.every((u) => u.matchId === "m29" || u.matchId === "m31"));

  console.log("verify:match-delete-resequence OK");
}

main();
