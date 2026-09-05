import type {
  PublicBracketDetailDTO,
  PublicBracketMatchDTO,
} from "@/lib/dto/public";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import {
  compareMatchOrder,
  type MatchOrderFields,
} from "@/lib/match-order-display";

export type PublicSpectatorMatchEntry = {
  match: PublicBracketMatchDTO;
  bracketId: string;
  bracketType: string;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string | null;
  bracketIsPublicSparring?: boolean;
};

export function comparePublicMatchGlobalOrder(
  a: MatchOrderFields & { id: string },
  b: MatchOrderFields & { id: string },
): number {
  const orderCmp = compareMatchOrder(a, b);
  if (orderCmp !== 0) return orderCmp;
  return a.id.localeCompare(b.id);
}

/** 공개 관람 대진표 — 대회 전체 경기 순서(flat) SSOT */
export function flattenPublicBracketsForSpectator(
  brackets: PublicBracketDetailDTO[],
): PublicSpectatorMatchEntry[] {
  const entries: PublicSpectatorMatchEntry[] = [];
  for (const bracket of brackets) {
    for (const match of bracket.matches) {
      entries.push({
        match,
        bracketId: bracket.id,
        bracketType: bracket.type,
        division: bracket.division,
        divisionLabel: bracket.divisionLabel,
        bracketIsPublicSparring: match.matchIsPublicSparring,
      });
    }
  }
  return entries.sort((a, b) =>
    comparePublicMatchGlobalOrder(a.match, b.match),
  );
}

export function collectPublicBracketMatchIds(
  brackets: PublicBracketDetailDTO[],
): string[] {
  return brackets
    .flatMap((bracket) => bracket.matches.map((match) => match.id))
    .sort();
}

export function assertPublicBracketMatchCompleteness(
  brackets: PublicBracketDetailDTO[],
  flattened: PublicSpectatorMatchEntry[],
): void {
  const expected = collectPublicBracketMatchIds(brackets);
  const actual = flattened.map((entry) => entry.match.id).sort();
  if (expected.length !== actual.length) {
    throw new Error(
      `public bracket match count mismatch: expected ${expected.length}, got ${actual.length}`,
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      throw new Error(
        `public bracket match id mismatch at index ${i}: expected ${expected[i]}, got ${actual[i]}`,
      );
    }
  }
}
