/**
 * 공개 관람 대진표 — 대회 전체 경기 순서(flat) 검증
 *   npm run verify:public-bracket-global-order
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BracketMatchStatus, BracketType } from "@/generated/prisma";
import type {
  PublicBracketDetailDTO,
  PublicBracketMatchDTO,
} from "@/lib/dto/public";
import {
  assertPublicBracketMatchCompleteness,
  flattenPublicBracketsForSpectator,
} from "../src/lib/public-bracket-global-order";
import { getMatchOrderSortKey } from "../src/lib/match-order-display";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function makeMatch(
  id: string,
  matchNumber: number,
  overrides: Partial<PublicBracketMatchDTO> = {},
): PublicBracketMatchDTO {
  return {
    id,
    round: 1,
    roundName: null,
    matchOrder: matchNumber - 1,
    globalMatchOrder: null,
    matchNumber,
    matNumber: null,
    courtName: "제1 경기장",
    courtId: "court-1",
    courtOrder: matchNumber,
    fighterRed: null,
    fighterBlue: null,
    status: "waiting" as BracketMatchStatus,
    winnerId: null,
    loserId: null,
    resultType: null,
    ...overrides,
  };
}

function makeBracket(
  id: string,
  divisionLabel: string,
  matches: PublicBracketMatchDTO[],
): PublicBracketDetailDTO {
  return {
    id,
    title: divisionLabel,
    displayTitle: divisionLabel,
    type: "match_list" as BracketType,
    status: "published",
    division: {
      sportType: null,
      ruleType: null,
      gender: divisionLabel.split(" · ")[1] ?? null,
      ageGroup: divisionLabel.split(" · ")[0] ?? divisionLabel,
      weightClass: null,
      skillLevel: null,
    },
    divisionLabel,
    matches,
  };
}

function assertStaticSpectatorUi() {
  const tab = read(
    "src/components/domain/events/spectator/SpectatorBracketTab.tsx",
  );
  assert.match(tab, /flattenPublicBracketsForSpectator/);
  assert.doesNotMatch(tab, /BracketGroupHeader/);
  assert.doesNotMatch(tab, /brackets\.map\(\(bracket\)/);

  const card = read(
    "src/components/domain/events/spectator/SpectatorMatchCard.tsx",
  );
  assert.match(card, /미배정/);
  assert.match(card, /MatchDivisionHeader/);
}

function assertGlobalOrderFixture() {
  const brackets: PublicBracketDetailDTO[] = [
    makeBracket("b-elem", "초등부 · 남성", [makeMatch("m1", 1)]),
    makeBracket("b-general", "일반부 · 여성", [makeMatch("m2", 2)]),
    makeBracket("b-middle", "중등부 · 남성", [
      makeMatch("m3", 3),
      makeMatch("m5", 5, { status: "completed" as BracketMatchStatus }),
    ]),
    makeBracket("b-high", "고등부 · 남성", [makeMatch("m4", 4)]),
  ];

  const flat = flattenPublicBracketsForSpectator(brackets);
  assertPublicBracketMatchCompleteness(brackets, flat);

  assert.equal(flat.length, 5);
  assert.deepEqual(
    flat.map((entry) => entry.match.id),
    ["m1", "m2", "m3", "m4", "m5"],
  );
  assert.deepEqual(
    flat.map((entry) => entry.match.matchNumber),
    [1, 2, 3, 4, 5],
  );
  assert.equal(getMatchOrderSortKey(flat[0]!.match), 1);
  assert.equal(getMatchOrderSortKey(flat[4]!.match), 5);
}

function assertAllStatusesIncluded() {
  const brackets = [
    makeBracket("b1", "중등부 · 남성", [
      makeMatch("waiting", 1, { status: "waiting" as BracketMatchStatus }),
      makeMatch("in_progress", 2, {
        status: "in_progress" as BracketMatchStatus,
      }),
      makeMatch("completed", 3, { status: "completed" as BracketMatchStatus }),
      makeMatch("cancelled", 4, { status: "cancelled" as BracketMatchStatus }),
      makeMatch("one-sided", 5, {
        fighterRed: {
          name: "홍길동",
          gymName: "A짐",
          profileImageUrl: null,
          recordSummary: "",
          divisionName: null,
        },
        fighterBlue: null,
      }),
      makeMatch("empty", 6),
    ]),
  ];

  const flat = flattenPublicBracketsForSpectator(brackets);
  assert.equal(flat.length, 6);
  assert.deepEqual(
    flat.map((entry) => entry.match.id),
    ["waiting", "in_progress", "completed", "cancelled", "one-sided", "empty"],
  );
}

function assertStableFallbackSort() {
  const brackets = [
    makeBracket("b1", "A", [
      makeMatch("m-b", 3),
      makeMatch("m-a", 3),
    ]),
  ];
  const flat = flattenPublicBracketsForSpectator(brackets);
  assert.deepEqual(
    flat.map((entry) => entry.match.id),
    ["m-a", "m-b"],
  );
}

function main() {
  assertStaticSpectatorUi();
  assertGlobalOrderFixture();
  assertAllStatusesIncluded();
  assertStableFallbackSort();
  console.log("verify:public-bracket-global-order: OK");
}

main();
