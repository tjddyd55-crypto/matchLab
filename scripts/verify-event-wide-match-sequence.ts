/**
 * event-wide matchNumber 연속성
 *   npm run verify:event-wide-match-sequence
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  eventWideMatchNumbersNeedResequence,
  formatCourtScheduleMatchOrderShort,
  renumberEventWideMatchNumbers,
} from "../src/lib/court-match-order";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  assert.match(service, /applyEventWideMatchNumberResequence/);
  assert.match(service, /ensureEventWideMatchDisplayNumbers/);
  assert.match(service, /changeMatchDivision/);
  assert.match(service, /nextEventWideMatchNumber/);

  const courts = [
    { id: "c1", sortOrder: 0 },
    { id: "c2", sortOrder: 1 },
  ];

  // A. gap 23/26 → 상대 순서 유지하며 1…N
  const healed = renumberEventWideMatchNumbers(
    [
      { matchId: "a", courtId: "c1", courtOrder: 1, matchNumber: 23 },
      { matchId: "b", courtId: "c1", courtOrder: 2, matchNumber: 26 },
    ],
    courts,
  );
  assert.deepEqual(
    healed.map((u) => [u.matchId, u.matchNumber]),
    [
      ["a", 1],
      ["b", 2],
    ],
  );

  // B. 중간 삭제 후 (21,22,23,25,26) → 1…5
  const afterDelete = renumberEventWideMatchNumbers(
    [21, 22, 23, 25, 26].map((n) => ({
      matchId: `m${n}`,
      courtId: "c1",
      courtOrder: n,
      matchNumber: n,
    })),
    courts,
  );
  assert.deepEqual(
    afterDelete.map((u) => u.matchNumber),
    [1, 2, 3, 4, 5],
  );

  // C. 표시 SSOT = matchNumber (courtOrder와 달라도 matchNumber 우선)
  assert.equal(
    formatCourtScheduleMatchOrderShort({
      matchId: "x",
      courtId: "c1",
      courtOrder: 99,
      matchNumber: 7,
      globalMatchOrder: null,
      matchOrder: 0,
    }),
    "7경기",
  );

  // D. 여러 경기장 — matchNumber 기준 event-wide 연속
  const multi = renumberEventWideMatchNumbers(
    [
      { matchId: "a", courtId: "c1", courtOrder: 1, matchNumber: 1 },
      { matchId: "b", courtId: "c2", courtOrder: 1, matchNumber: 3 },
      { matchId: "c", courtId: "c1", courtOrder: 2, matchNumber: 2 },
    ],
    courts,
  );
  assert.deepEqual(
    multi.map((u) => [u.matchId, u.matchNumber]),
    [
      ["a", 1],
      ["c", 2],
      ["b", 3],
    ],
  );

  assert.equal(
    eventWideMatchNumbersNeedResequence([
      { matchNumber: 1 },
      { matchNumber: 2 },
      { matchNumber: 3 },
    ]),
    false,
  );
  assert.equal(
    eventWideMatchNumbersNeedResequence([
      { matchNumber: 23 },
      { matchNumber: 26 },
    ]),
    true,
  );
  assert.equal(
    eventWideMatchNumbersNeedResequence([{ matchNumber: null }]),
    true,
  );

  const deleteBody = service.slice(service.indexOf("async deleteBracketMatch"));
  assert.match(deleteBody, /applyEventWideMatchNumberResequence/);

  console.log("verify:event-wide-match-sequence OK");
}

main();
