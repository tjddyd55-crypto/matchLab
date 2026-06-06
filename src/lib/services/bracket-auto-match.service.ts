import "server-only";

import {
  BracketChangeType,
  BracketType,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  buildFighterBracketSnapshot,
  formatDivisionNameLabel,
} from "@/lib/bracket-snapshot";
import {
  groupCandidatesByDivision,
  pairCandidatesWithinDivision,
  type AutoMatchCandidate,
  type UnmatchedReason,
} from "@/lib/brackets/auto-match";
import { computeFieldEligibility } from "@/lib/field-eligibility";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { safeNotify } from "@/lib/notifications/safe-dispatch";
import { prisma } from "@/lib/prisma";
import { notificationRepository } from "@/lib/repositories/notification.repository";
import { notificationService } from "@/lib/services/notification.service";
import {
  bracketRepository,
  type AutoMatchApplicationRow,
} from "@/lib/repositories/bracket.repository";
import type { GenerateAutoBracketMatchesInput } from "@/lib/validators/bracket-auto-match.validator";

export type AutoBracketGenerationSummary = {
  createdMatches: number;
  unmatchedCount: number;
  divisionsProcessed: number;
  excludedAlreadyPlaced: number;
  ineligibleWarningCount: number;
  sameGymPairWarnings: number;
  createdBrackets: number;
  resetDeletedMatches: number;
  messages: string[];
};

export type UnmatchedBracketCandidateVM = {
  applicationId: string;
  fighterId: string;
  fighterName: string;
  gymName: string;
  divisionLabel: string;
  gender: string | null;
  ageGroup: string | null;
  applicationStatus: string;
  isEligibleForBracket: boolean;
  eligibilityLabel: string;
  reason: UnmatchedReason;
  reasonLabel: string;
};

export type CanResetBracketSafelyResult = {
  safe: boolean;
  matchesWithResults: number;
};

const REASON_LABELS: Record<UnmatchedReason, string> = {
  odd_count: "홀수 인원으로 남음",
  no_opponent_in_division: "같은 division 내 상대 없음",
  not_field_eligible: "출전 미확정",
  already_placed: "이미 다른 대진에 배치됨",
  missing_division: "division 정보 없음",
};

function toAutoMatchCandidate(
  row: AutoMatchApplicationRow,
): AutoMatchCandidate {
  const eligibility = computeFieldEligibility({
    checkInStatus: row.checkInStatus,
    weighInStatus: row.weighInStatus,
  });
  return {
    applicationId: row.id,
    fighterId: row.fighterId,
    divisionId: row.divisionId,
    gymId: row.gymId,
    gymName: row.gym.name,
    fighterName: row.fighter.name,
    appliedAt: row.appliedAt ?? row.createdAt,
    isEligibleForBracket: eligibility.isEligibleForBracket,
  };
}

function toPlacementRow(row: AutoMatchApplicationRow) {
  return {
    id: row.id,
    fighterId: row.fighterId,
    divisionId: row.divisionId,
    fighter: row.fighter,
    division: row.division,
    gym: { name: row.gym.name },
  };
}

export const bracketAutoMatchService = {
  async canResetBracketSafely(
    actor: ActorContext,
    eventId: string,
  ): Promise<CanResetBracketSafelyResult> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const matchesWithResults =
      await bracketRepository.countEventMatchesWithOfficialResults(eventId);
    return {
      safe: matchesWithResults === 0,
      matchesWithResults,
    };
  },

  async listUnmatchedCandidatesForEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<UnmatchedBracketCandidateVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const applications =
      await bracketRepository.listApprovedApplicationsForAutoMatch(eventId);
    const placedIds = new Set(
      await bracketRepository.listPlacedFighterIdsForEvent(eventId),
    );

    const unplacedByDivision = new Map<string, AutoMatchApplicationRow[]>();

    const result: UnmatchedBracketCandidateVM[] = [];

    for (const row of applications) {
      const eligibility = computeFieldEligibility({
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
      });

      if (!row.divisionId) {
        result.push(mapUnmatchedRow(row, eligibility, "missing_division"));
        continue;
      }

      if (placedIds.has(row.fighterId)) {
        result.push(mapUnmatchedRow(row, eligibility, "already_placed"));
        continue;
      }

      if (!eligibility.isEligibleForBracket) {
        result.push(mapUnmatchedRow(row, eligibility, "not_field_eligible"));
        continue;
      }

      const list = unplacedByDivision.get(row.divisionId) ?? [];
      list.push(row);
      unplacedByDivision.set(row.divisionId, list);
    }

    for (const [, group] of unplacedByDivision) {
      const candidates = group.map(toAutoMatchCandidate);
      const pairing = pairCandidatesWithinDivision(candidates);
      for (const u of pairing.unmatched) {
        const row = group.find((g) => g.fighterId === u.fighterId);
        if (!row) continue;
        const eligibility = computeFieldEligibility({
          checkInStatus: row.checkInStatus,
          weighInStatus: row.weighInStatus,
        });
        const reason: UnmatchedReason =
          group.length === 1 ? "no_opponent_in_division" : "odd_count";
        result.push(mapUnmatchedRow(row, eligibility, reason));
      }
    }

    return result.sort((a, b) =>
      a.gymName.localeCompare(b.gymName, "ko") ||
      a.fighterName.localeCompare(b.fighterName, "ko"),
    );
  },

  async generateAutoBracketMatchesForEvent(
    actor: ActorContext,
    input: GenerateAutoBracketMatchesInput,
  ): Promise<AutoBracketGenerationSummary> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const applications =
      await bracketRepository.listApprovedApplicationsForAutoMatch(
        input.eventId,
      );

    if (applications.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "자동 매칭할 승인 선수가 없습니다.",
      );
    }

    let placedIds = new Set(
      await bracketRepository.listPlacedFighterIdsForEvent(input.eventId),
    );

    const summary: AutoBracketGenerationSummary = {
      createdMatches: 0,
      unmatchedCount: 0,
      divisionsProcessed: 0,
      excludedAlreadyPlaced: 0,
      ineligibleWarningCount: 0,
      sameGymPairWarnings: 0,
      createdBrackets: 0,
      resetDeletedMatches: 0,
      messages: [],
    };

    if (input.resetExisting) {
      const resetCheck = await bracketAutoMatchService.canResetBracketSafely(
        actor,
        input.eventId,
      );
      if (!resetCheck.safe) {
        throw new AppError(
          "CONFLICT",
          "결과가 입력된 경기가 있어 전체 재생성을 할 수 없습니다.",
        );
      }
      summary.resetDeletedMatches =
        await bracketRepository.deleteAllEventBracketMatches(input.eventId);
      placedIds = new Set();
    }

    const matchable: AutoMatchCandidate[] = [];
    for (const row of applications) {
      if (placedIds.has(row.fighterId)) {
        summary.excludedAlreadyPlaced += 1;
        continue;
      }
      const candidate = toAutoMatchCandidate(row);
      if (input.eligibleOnly && !candidate.isEligibleForBracket) {
        summary.ineligibleWarningCount += 1;
        continue;
      }
      if (!candidate.isEligibleForBracket) {
        summary.ineligibleWarningCount += 1;
      }
      matchable.push(candidate);
    }

    if (matchable.length === 0) {
      if (summary.excludedAlreadyPlaced > 0 && !input.resetExisting) {
        throw new AppError(
          "VALIDATION_ERROR",
          "이미 모든 승인 선수가 대진에 배치되어 있습니다.",
        );
      }
      throw new AppError(
        "VALIDATION_ERROR",
        "자동 매칭할 승인 선수가 없습니다.",
      );
    }

    const byDivision = groupCandidatesByDivision(matchable);
    const appByFighterDivision = new Map(
      applications.map((a) => [`${a.fighterId}:${a.divisionId}`, a]),
    );
    const placedFighterIds: string[] = [];
    const unmatchedGymIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [divisionId, group] of byDivision) {
        const pairing = pairCandidatesWithinDivision(group);
        summary.unmatchedCount += pairing.unmatched.length;
        for (const u of pairing.unmatched) {
          unmatchedGymIds.push(u.gymId);
        }

        if (pairing.pairs.length === 0) {
          if (group.length > 0) summary.divisionsProcessed += 1;
          continue;
        }

        summary.divisionsProcessed += 1;
        summary.sameGymPairWarnings += pairing.sameGymPairCount;

        let bracket =
          await bracketRepository.findMatchListBracketByDivision(
            input.eventId,
            divisionId,
            tx,
          );

        if (!bracket) {
          const sampleRow = appByFighterDivision.get(
            `${group[0]!.fighterId}:${divisionId}`,
          );
          const divisionLabel = sampleRow
            ? formatDivisionNameLabel(sampleRow.division)
            : divisionId;
          const { id } = await bracketRepository.createBracket(
            {
              eventId: input.eventId,
              divisionId,
              title: `자동 생성 · ${divisionLabel}`,
              type: BracketType.match_list,
            },
            tx,
          );
          bracket = { id, title: `자동 생성 · ${divisionLabel}` };
          summary.createdBrackets += 1;

          await bracketRepository.createBracketChangeLog(
            {
              eventId: input.eventId,
              bracketId: id,
              changedByUserId: actor.userId,
              bracketType: BracketType.match_list,
              changeType: BracketChangeType.bracket_created,
              afterData: { title: bracket.title, autoGenerated: true },
              reason: "자동 대진 생성으로 match_list 브래킷이 생성되었습니다.",
            },
            tx,
          );
        }

        let nextOrder =
          (await bracketRepository.getMaxMatchOrderForBracket(
            bracket.id,
            tx,
          )) + 1;

        for (const pair of pairing.pairs) {
          placedFighterIds.push(pair.red.fighterId, pair.blue.fighterId);

          const redRow = appByFighterDivision.get(
            `${pair.red.fighterId}:${divisionId}`,
          );
          const blueRow = appByFighterDivision.get(
            `${pair.blue.fighterId}:${divisionId}`,
          );
          if (!redRow || !blueRow) continue;

          const { id: matchId } = await bracketRepository.createBracketMatch(
            {
              bracketId: bracket.id,
              matchOrder: nextOrder,
              fighterRedId: redRow.fighterId,
              fighterBlueId: blueRow.fighterId,
              fighterRedSnapshot: buildFighterBracketSnapshot(
                toPlacementRow(redRow),
              ),
              fighterBlueSnapshot: buildFighterBracketSnapshot(
                toPlacementRow(blueRow),
              ),
            },
            tx,
          );

          await bracketRepository.createBracketChangeLog(
            {
              eventId: input.eventId,
              bracketId: bracket.id,
              matchId,
              changedByUserId: actor.userId,
              bracketType: BracketType.match_list,
              changeType: BracketChangeType.fighter_assigned,
              afterData: {
                fighterRedId: redRow.fighterId,
                fighterBlueId: blueRow.fighterId,
                matchOrder: nextOrder,
                autoGenerated: true,
                sameGymWarning: pair.sameGymWarning,
              },
              reason: pair.sameGymWarning
                ? "자동 대진 생성(같은 체육관 매칭 — 후보 부족)"
                : "자동 대진 생성",
            },
            tx,
          );

          summary.createdMatches += 1;
          nextOrder += 1;
        }
      }
    });

    if (summary.unmatchedCount > 0) {
      summary.messages.push(
        `일부 선수는 홀수 인원으로 미매칭 목록에 남았습니다. (${summary.unmatchedCount}명)`,
      );
    }
    if (summary.sameGymPairWarnings > 0) {
      summary.messages.push(
        `같은 체육관끼리 매칭된 경기가 ${summary.sameGymPairWarnings}건 있습니다.`,
      );
    }
    if (summary.ineligibleWarningCount > 0 && !input.eligibleOnly) {
      summary.messages.push(
        `출전 미확정 선수 ${summary.ineligibleWarningCount}명이 포함되었습니다.`,
      );
    }

    if (summary.createdMatches > 0 || summary.unmatchedCount > 0) {
      const ev = await notificationRepository.getEventSlugTitle(input.eventId);
      if (ev) {
        safeNotify(`auto-bracket:${input.eventId}`, () =>
          notificationService.notifyBracketAutoGenerated({
            eventId: input.eventId,
            eventTitle: ev.title,
            createdMatches: summary.createdMatches,
            unmatchedCount: summary.unmatchedCount,
            placedFighterIds: [...new Set(placedFighterIds)],
            unmatchedGymIds: [...new Set(unmatchedGymIds)],
          }),
        );
      }
    }

    return summary;
  },
};

function mapUnmatchedRow(
  row: AutoMatchApplicationRow,
  eligibility: ReturnType<typeof computeFieldEligibility>,
  reason: UnmatchedReason,
): UnmatchedBracketCandidateVM {
  return {
    applicationId: row.id,
    fighterId: row.fighterId,
    fighterName: row.fighter.name,
    gymName: row.gym.name,
    divisionLabel: formatDivisionNameLabel(row.division),
    gender: row.division.gender ?? row.fighter.gender,
    ageGroup: row.division.ageGroup,
    applicationStatus: row.status,
    isEligibleForBracket: eligibility.isEligibleForBracket,
    eligibilityLabel: eligibility.eligibilityLabel,
    reason,
    reasonLabel: REASON_LABELS[reason],
  };
}
