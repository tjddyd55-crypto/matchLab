import "server-only";

import {
  JudgeScorecardStatus,
  MatchRecordStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { AppError } from "@/lib/errors/app-error";
import { formatBirthDateInput, judgeRoleCanScore, JUDGE_ROLE_LABELS } from "@/lib/judge-identity";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import {
  hasAnyCompleteJudgeRound,
  validateJudgeRounds,
} from "@/lib/judge-round-score-validation";
import {
  aggregateJudgeScorecards,
  computeScorecardTotals,
  type JudgeMatchAggregationVM,
} from "@/lib/judge-score-aggregation";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { judgeAssignmentRepository } from "@/lib/repositories/judge-assignment.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import { judgeScorecardChangeLogRepository } from "@/lib/repositories/judge-scorecard-change-log.repository";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import type { SaveJudgeScorecardInput } from "@/lib/validators/judge.validator";
import type { ResolvedJudgeSession } from "@/lib/services/judge-credential.service";
import { judgeAssignmentService } from "@/lib/services/judge-assignment.service";

export type JudgeMatchListItemVM = {
  matchId: string;
  eventTitle: string;
  eventDate: string;
  location: string | null;
  matchNumber: number | null;
  divisionLabel: string | null;
  roundCount: number;
  fighterRedName: string;
  fighterBlueName: string;
  scorecardStatus: JudgeScorecardStatus | "none";
  isLocked: boolean;
};

export type JudgeScorecardFormVM = {
  matchId: string;
  eventTitle: string;
  eventDate: string;
  location: string | null;
  matchNumber: number | null;
  divisionLabel: string | null;
  roundCount: number;
  judgeName: string;
  fighterRedName: string;
  fighterBlueName: string;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  status: JudgeScorecardStatus;
  decisionMethod: string | null;
  memo: string | null;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: string;
  isLocked: boolean;
  rounds: {
    roundNumber: number;
    redScore: number | null;
    blueScore: number | null;
    redKnockdowns: number;
    blueKnockdowns: number;
    redDeductions: number;
    blueDeductions: number;
    warningMemo: string | null;
    roundMemo: string | null;
  }[];
};

function fighterDisplayName(
  fighter: { name: string } | null,
  snapshot: unknown,
): string {
  if (fighter?.name) return fighter.name;
  if (snapshot && typeof snapshot === "object" && snapshot !== null) {
    const n = (snapshot as { name?: string }).name;
    if (n) return n;
  }
  return "미배정";
}

async function loadMatchContext(matchId: string) {
  const m = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: {
      fighterRed: { select: { id: true, name: true } },
      fighterBlue: { select: { id: true, name: true } },
      matchResults: { select: { status: true } },
      bracket: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              location: true,
              locationName: true,
            },
          },
          division: {
            select: {
              sportType: true,
              ruleType: true,
              gender: true,
              ageGroup: true,
              weightClass: true,
              skillLevel: true,
            },
          },
        },
      },
    },
  });
  if (!m) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
  return m;
}

function isMatchResultLocked(
  results: { status: MatchRecordStatus }[],
): boolean {
  const official = results.filter(
    (r) =>
      r.status === MatchRecordStatus.confirmed ||
      r.status === MatchRecordStatus.corrected,
  );
  return official.length >= 2;
}

function emptyRounds(roundCount: number) {
  return Array.from({ length: roundCount }, (_, i) => ({
    roundNumber: i + 1,
    redScore: null as number | null,
    blueScore: null as number | null,
    redKnockdowns: 0,
    blueKnockdowns: 0,
    redDeductions: 0,
    blueDeductions: 0,
    warningMemo: null as string | null,
    roundMemo: null as string | null,
  }));
}

export const judgeScorecardService = {
  async listAssignedMatches(
    session: ResolvedJudgeSession,
  ): Promise<JudgeMatchListItemVM[]> {
    const assignments = await judgeAssignmentRepository.listByCredential(
      session.credentialId,
    );
    const matchIds = [
      ...new Set(
        assignments
          .filter((a) => a.eventId === session.eventId && a.isActive)
          .map((a) => a.matchId),
      ),
    ];
    if (matchIds.length === 0) return [];

    const matches = await prisma.bracketMatch.findMany({
      where: { id: { in: matchIds } },
      include: {
        fighterRed: { select: { name: true } },
        fighterBlue: { select: { name: true } },
        matchResults: { select: { status: true } },
        bracket: {
          include: {
            event: {
              select: {
                title: true,
                eventDate: true,
                location: true,
                locationName: true,
              },
            },
            division: {
              select: {
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
      },
      orderBy: [{ globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    });

    const cards = await Promise.all(
      matchIds.map((id) =>
        judgeScorecardRepository.findByMatchAndCredential(
          id,
          session.credentialId,
        ),
      ),
    );
    const cardByMatch = new Map(
      matchIds.map((id, i) => [id, cards[i]] as const),
    );

    return matches.map((m) => {
      const card = cardByMatch.get(m.id);
      const sportType = m.bracket.division?.sportType ?? null;
      const roundCount =
        card?.roundCount ?? defaultRoundCountForSport(sportType);
      const locked = isMatchResultLocked(m.matchResults);

      return {
        matchId: m.id,
        eventTitle: m.bracket.event.title,
        eventDate: m.bracket.event.eventDate.toISOString(),
        location:
          m.bracket.event.locationName ?? m.bracket.event.location ?? null,
        matchNumber: m.matchNumber,
        divisionLabel: m.bracket.division
          ? formatDivisionNameLabel(m.bracket.division)
          : null,
        roundCount,
        fighterRedName: fighterDisplayName(
          m.fighterRed,
          m.fighterRedSnapshot,
        ),
        fighterBlueName: fighterDisplayName(
          m.fighterBlue,
          m.fighterBlueSnapshot,
        ),
        scorecardStatus: locked
          ? "locked"
          : card?.status ?? "none",
        isLocked: locked,
      };
    });
  },

  async getScorecardForm(
    session: ResolvedJudgeSession,
    matchId: string,
  ): Promise<JudgeScorecardFormVM> {
    await judgeAssignmentService.assertJudgeAssignedToMatch(session, matchId);

    const m = await loadMatchContext(matchId);
    const sportType = m.bracket.division?.sportType ?? null;
    const defaultRounds = defaultRoundCountForSport(sportType);
    const locked = isMatchResultLocked(m.matchResults);

    const existing = await judgeScorecardRepository.findByMatchAndCredential(
      matchId,
      session.credentialId,
    );

    const roundCount = existing?.roundCount ?? defaultRounds;
    const rounds =
      existing && existing.rounds.length > 0
        ? existing.rounds.map((r) => ({
            roundNumber: r.roundNumber,
            redScore: r.redScore,
            blueScore: r.blueScore,
            redKnockdowns: r.redKnockdowns,
            blueKnockdowns: r.blueKnockdowns,
            redDeductions: r.redDeductions,
            blueDeductions: r.blueDeductions,
            warningMemo: r.warningMemo,
            roundMemo: r.roundMemo,
          }))
        : emptyRounds(roundCount);

    const judgeName =
      session.verifiedName ??
      existing?.judgeName ??
      "";

    return {
      matchId: m.id,
      eventTitle: m.bracket.event.title,
      eventDate: m.bracket.event.eventDate.toISOString(),
      location:
        m.bracket.event.locationName ?? m.bracket.event.location ?? null,
      matchNumber: m.matchNumber,
      divisionLabel: m.bracket.division
        ? formatDivisionNameLabel(m.bracket.division)
        : null,
      roundCount,
      judgeName,
      fighterRedName: fighterDisplayName(m.fighterRed, m.fighterRedSnapshot),
      fighterBlueName: fighterDisplayName(
        m.fighterBlue,
        m.fighterBlueSnapshot,
      ),
      fighterRedId: m.fighterRedId,
      fighterBlueId: m.fighterBlueId,
      status: locked
        ? JudgeScorecardStatus.locked
        : existing?.status ?? JudgeScorecardStatus.draft,
      decisionMethod: existing?.decisionMethod ?? null,
      memo: existing?.memo ?? null,
      redTotal: existing?.redTotal ?? null,
      blueTotal: existing?.blueTotal ?? null,
      winnerCorner: existing?.winnerCorner ?? "undecided",
      isLocked: locked,
      rounds,
    };
  },

  async saveScorecard(
    session: ResolvedJudgeSession,
    input: SaveJudgeScorecardInput,
  ): Promise<void> {
    if (!judgeRoleCanScore(session.role)) {
      throw new AppError("FORBIDDEN", "채점 권한이 없는 역할입니다.");
    }
    if (!session.verifiedName?.trim()) {
      throw new AppError("FORBIDDEN", "본인 확인 후 채점할 수 있습니다.");
    }

    await judgeAssignmentService.assertJudgeAssignedToMatch(
      session,
      input.matchId,
    );

    const m = await loadMatchContext(input.matchId);
    if (isMatchResultLocked(m.matchResults)) {
      throw new AppError(
        "FORBIDDEN",
        "이미 공식 결과가 확정되어 채점표를 수정할 수 없습니다.",
      );
    }

    const existing = await judgeScorecardRepository.findByMatchAndCredential(
      input.matchId,
      session.credentialId,
    );
    if (existing?.status === JudgeScorecardStatus.locked) {
      throw new AppError("FORBIDDEN", "잠긴 채점표는 수정할 수 없습니다.");
    }

    const credential = await judgeCredentialRepository.findById(
      session.credentialId,
    );
    if (!credential) {
      throw new AppError("UNAUTHORIZED", "심판 계정을 찾을 수 없습니다.");
    }

    const judgeName = session.verifiedName.trim();
    const birthSnapshot = credential.birthDate
      ? formatBirthDateInput(credential.birthDate)
      : null;

    const roundCount = input.rounds.length;
    const halfFilledError = validateJudgeRounds(input.rounds);
    if (halfFilledError) {
      throw new AppError("VALIDATION_ERROR", halfFilledError);
    }
    if (input.submit && !hasAnyCompleteJudgeRound(input.rounds)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "최소 1개 라운드 점수를 입력해 주세요.",
      );
    }

    const totals = computeScorecardTotals(input.rounds);
    const meta = await readRequestClientMeta();

    let status: JudgeScorecardStatus;
    if (input.submit) {
      status =
        existing?.status === JudgeScorecardStatus.submitted ||
        existing?.status === JudgeScorecardStatus.revised
          ? JudgeScorecardStatus.revised
          : JudgeScorecardStatus.submitted;
    } else {
      status = JudgeScorecardStatus.draft;
    }

    const action = input.submit
      ? existing?.status === JudgeScorecardStatus.submitted ||
        existing?.status === JudgeScorecardStatus.revised
        ? "revise"
        : "submit"
      : "draft_save";

    const upserted = await judgeScorecardRepository.upsertDraft({
      eventId: m.bracket.event.id,
      matchId: input.matchId,
      credentialId: session.credentialId,
      judgeName,
      judgeBirthDateSnapshot: birthSnapshot,
      judgeRoleSnapshot: session.role,
      cornerRedFighterId: m.fighterRedId,
      cornerBlueFighterId: m.fighterBlueId,
      roundCount,
      status,
      redTotal: input.submit ? totals.redTotal : existing?.redTotal ?? null,
      blueTotal: input.submit ? totals.blueTotal : existing?.blueTotal ?? null,
      winnerCorner: input.submit
        ? totals.winnerCorner
        : existing?.winnerCorner ?? "undecided",
      decisionMethod: input.decisionMethod ?? null,
      memo: input.memo?.trim() || null,
      submittedAt: input.submit ? new Date() : existing?.submittedAt ?? null,
      submittedIp: input.submit ? meta.ip : existing?.submittedIp ?? null,
      submittedUserAgent: input.submit
        ? meta.userAgent
        : existing?.submittedUserAgent ?? null,
      rounds: input.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        redScore: r.redScore,
        blueScore: r.blueScore,
        redKnockdowns: r.redKnockdowns ?? 0,
        blueKnockdowns: r.blueKnockdowns ?? 0,
        redDeductions: r.redDeductions ?? 0,
        blueDeductions: r.blueDeductions ?? 0,
        warningMemo: r.warningMemo?.trim() || null,
        roundMemo: r.roundMemo?.trim() || null,
      })),
    });

    await judgeScorecardChangeLogRepository.create({
      scorecardId: upserted.id,
      eventId: upserted.eventId,
      matchId: upserted.matchId,
      credentialId: upserted.credentialId,
      judgeNameSnapshot: judgeName,
      judgeBirthDateSnapshot: birthSnapshot,
      judgeRoleSnapshot: session.role,
      action,
      previousStatus: existing?.status ?? null,
      newStatus: status,
      previousRedTotal: existing?.redTotal ?? null,
      previousBlueTotal: existing?.blueTotal ?? null,
      newRedTotal: upserted.redTotal,
      newBlueTotal: upserted.blueTotal,
      previousWinnerCorner: existing?.winnerCorner ?? null,
      newWinnerCorner: upserted.winnerCorner,
      roundsSnapshotJson: input.rounds,
      changedByCredentialId: session.credentialId,
      changedIp: meta.ip,
      changedUserAgent: meta.userAgent,
    });
  },

  async getMatchAggregationForOrganizer(
    actor: ActorContext,
    matchId: string,
  ): Promise<JudgeMatchAggregationVM> {
    requireRole(actor, ["organizer", "admin"]);
    const m = await loadMatchContext(matchId);
    await requireOrganizerForEvent(actor, m.bracket.event.id);

    const assignments = await judgeAssignmentRepository.listByMatch(matchId);
    const scorecards = await judgeScorecardRepository.listByMatch(matchId);

    const assignedJudgeNames = assignments.map(
      (a) => a.credential?.displayName ?? a.credential?.loginId ?? `심판${a.judgeOrder}`,
    );

    const cardInputs = assignments.map((a) => {
      const card = scorecards.find((s) => s.credentialId === a.credentialId);
      const submitted =
        card?.status === "submitted" ||
        card?.status === "revised" ||
        card?.status === "locked";
      const role = card?.judgeRoleSnapshot ?? a.credential?.role ?? "SCORING_JUDGE";
      return {
        judgeName:
          card?.judgeName ??
          a.credential?.verifiedName ??
          a.credential?.displayName ??
          a.credential?.loginId ??
          `심판${a.judgeOrder}`,
        roleLabel: JUDGE_ROLE_LABELS[role],
        redTotal: card?.redTotal ?? null,
        blueTotal: card?.blueTotal ?? null,
        winnerCorner: card?.winnerCorner ?? "undecided",
        submitted: Boolean(submitted),
        submittedAt: card?.submittedAt?.toISOString() ?? null,
      };
    });

    return aggregateJudgeScorecards(assignedJudgeNames, cardInputs);
  },

  async getMatchAggregationDetailForOrganizer(
    actor: ActorContext,
    matchId: string,
  ) {
    const aggregation =
      await judgeScorecardService.getMatchAggregationForOrganizer(
        actor,
        matchId,
      );
    const scorecards = await judgeScorecardRepository.listByMatch(matchId);
    return { aggregation, scorecards };
  },

  async getEventJudgeSummary(
    actor: ActorContext,
    eventId: string,
  ): Promise<
    {
      matchId: string;
      assignedCount: number;
      submittedCount: number;
    }[]
  > {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const assignments = await judgeAssignmentRepository.listByEvent(eventId);
    const scorecards = await judgeScorecardRepository.listByEvent(eventId);

    const byMatch = new Map<string, { assigned: number; submitted: number }>();
    for (const a of assignments) {
      const cur = byMatch.get(a.matchId) ?? { assigned: 0, submitted: 0 };
      cur.assigned += 1;
      byMatch.set(a.matchId, cur);
    }
    for (const s of scorecards) {
      if (
        s.status !== "submitted" &&
        s.status !== "revised" &&
        s.status !== "locked"
      ) {
        continue;
      }
      const cur = byMatch.get(s.matchId) ?? { assigned: 0, submitted: 0 };
      cur.submitted += 1;
      byMatch.set(s.matchId, cur);
    }

    return [...byMatch.entries()].map(([matchId, v]) => ({
      matchId,
      assignedCount: v.assigned,
      submittedCount: v.submitted,
    }));
  },

  async listSubmittedBriefByEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<
    Record<string, { judgeName: string; winnerCorner: string }[]>
  > {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const scorecards = await judgeScorecardRepository.listByEvent(eventId);
    const byMatch: Record<string, { judgeName: string; winnerCorner: string }[]> =
      {};

    for (const s of scorecards) {
      if (
        s.status !== "submitted" &&
        s.status !== "revised" &&
        s.status !== "locked"
      ) {
        continue;
      }
      const list = byMatch[s.matchId] ?? [];
      list.push({
        judgeName: s.judgeName,
        winnerCorner: s.winnerCorner,
      });
      byMatch[s.matchId] = list;
    }

    return byMatch;
  },

  async listEventMatchesForHeadJudge(
    session: ResolvedJudgeSession,
  ): Promise<
    {
      matchId: string;
      matchNumber: number | null;
      fighterRedName: string;
      fighterBlueName: string;
      assignedCount: number;
      submittedCount: number;
    }[]
  > {
    if (session.role !== "HEAD_JUDGE" && session.role !== "ANNOUNCER") {
      throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
    }

    const matches = await prisma.bracketMatch.findMany({
      where: { bracket: { eventId: session.eventId } },
      include: {
        fighterRed: { select: { name: true } },
        fighterBlue: { select: { name: true } },
      },
      orderBy: [{ globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    });

    const assignments = await judgeAssignmentRepository.listByEvent(
      session.eventId,
    );
    const scorecards = await judgeScorecardRepository.listByEvent(
      session.eventId,
    );

    return matches.map((m) => {
      const assigned = assignments.filter((a) => a.matchId === m.id).length;
      const submitted = scorecards.filter(
        (s) =>
          s.matchId === m.id &&
          (s.status === "submitted" ||
            s.status === "revised" ||
            s.status === "locked"),
      ).length;
      return {
        matchId: m.id,
        matchNumber: m.matchNumber,
        fighterRedName: m.fighterRed?.name ?? "미배정",
        fighterBlueName: m.fighterBlue?.name ?? "미배정",
        assignedCount: assigned,
        submittedCount: submitted,
      };
    });
  },

  async getMatchAggregationForJudgeSession(
    session: ResolvedJudgeSession,
    matchId: string,
  ): Promise<JudgeMatchAggregationVM> {
    if (session.role !== "HEAD_JUDGE" && session.role !== "ANNOUNCER") {
      throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
    }

    const m = await loadMatchContext(matchId);
    if (m.bracket.event.id !== session.eventId) {
      throw new AppError("FORBIDDEN", "다른 대회 경기입니다.");
    }

    const assignments = await judgeAssignmentRepository.listByMatch(matchId);
    const scorecards = await judgeScorecardRepository.listByMatch(matchId);

    const assignedJudgeNames = assignments.map(
      (a) =>
        a.credential?.verifiedName ??
        a.credential?.displayName ??
        a.credential?.loginId ??
        `심판${a.judgeOrder}`,
    );

    const cardInputs = assignments.map((a) => {
      const card = scorecards.find((s) => s.credentialId === a.credentialId);
      const submitted =
        card?.status === "submitted" ||
        card?.status === "revised" ||
        card?.status === "locked";
      const role = card?.judgeRoleSnapshot ?? a.credential?.role ?? "SCORING_JUDGE";
      return {
        judgeName:
          card?.judgeName ??
          a.credential?.verifiedName ??
          a.credential?.displayName ??
          a.credential?.loginId ??
          `심판${a.judgeOrder}`,
        roleLabel: JUDGE_ROLE_LABELS[role],
        redTotal: card?.redTotal ?? null,
        blueTotal: card?.blueTotal ?? null,
        winnerCorner: card?.winnerCorner ?? "undecided",
        submitted: Boolean(submitted),
        submittedAt: card?.submittedAt?.toISOString() ?? null,
      };
    });

    return aggregateJudgeScorecards(assignedJudgeNames, cardInputs);
  },
};
