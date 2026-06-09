import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { ALLOWED_JUDGE_COUNTS } from "@/lib/judge-round-count";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { judgeAssignmentRepository } from "@/lib/repositories/judge-assignment.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import type { AssignJudgeInput } from "@/lib/validators/judge.validator";
import type { ResolvedJudgeSession } from "@/lib/services/judge-credential.service";

export type JudgeAssignmentVM = {
  id: string;
  matchId: string;
  credentialId: string | null;
  loginId: string | null;
  displayName: string | null;
  judgeOrder: number;
  isHeadJudge: boolean;
  hasSubmittedScorecard: boolean;
};

export const judgeAssignmentService = {
  async listByEventForOrganizer(
    actor: ActorContext,
    eventId: string,
  ): Promise<JudgeAssignmentVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const rows = await judgeAssignmentRepository.listByEvent(eventId);
    const scorecards = await judgeScorecardRepository.listByEvent(eventId);
    const submittedKeys = new Set(
      scorecards
        .filter((s) => s.status === "submitted" || s.status === "locked")
        .map((s) => `${s.matchId}:${s.credentialId}`),
    );

    return rows.map((r) => ({
      id: r.id,
      matchId: r.matchId,
      credentialId: r.credentialId,
      loginId: r.credential?.loginId ?? null,
      displayName: r.credential?.displayName ?? null,
      judgeOrder: r.judgeOrder,
      isHeadJudge: r.isHeadJudge,
      hasSubmittedScorecard: r.credentialId
        ? submittedKeys.has(`${r.matchId}:${r.credentialId}`)
        : false,
    }));
  },

  async listByMatchForOrganizer(
    actor: ActorContext,
    matchId: string,
  ): Promise<JudgeAssignmentVM[]> {
    const match = await prisma.bracketMatch.findUnique({
      where: { id: matchId },
      select: { bracket: { select: { eventId: true } } },
    });
    if (!match) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");

    const all = await judgeAssignmentService.listByEventForOrganizer(
      actor,
      match.bracket.eventId,
    );
    return all.filter((a) => a.matchId === matchId);
  },

  async assign(
    actor: ActorContext,
    input: AssignJudgeInput,
  ): Promise<JudgeAssignmentVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const match = await prisma.bracketMatch.findFirst({
      where: { id: input.matchId, bracket: { eventId: input.eventId } },
    });
    if (!match) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");

    const currentCount = await judgeAssignmentRepository.countActiveByMatch(
      input.matchId,
    );
    if (currentCount >= ALLOWED_JUDGE_COUNTS[ALLOWED_JUDGE_COUNTS.length - 1]) {
      throw new AppError("VALIDATION_ERROR", "경기당 최대 5명까지 배정할 수 있습니다.");
    }

    const existing = await judgeAssignmentRepository.listByMatch(input.matchId);
    if (
      existing.some(
        (a) => a.credentialId === input.credentialId && a.isActive,
      )
    ) {
      throw new AppError("CONFLICT", "이미 배정된 심판 계정입니다.");
    }

    const created = await judgeAssignmentRepository.create({
      eventId: input.eventId,
      matchId: input.matchId,
      credentialId: input.credentialId,
      judgeOrder: input.judgeOrder,
      isHeadJudge: input.isHeadJudge ?? false,
    });

    return {
      id: created.id,
      matchId: created.matchId,
      credentialId: created.credentialId,
      loginId: created.credential?.loginId ?? null,
      displayName: created.credential?.displayName ?? null,
      judgeOrder: created.judgeOrder,
      isHeadJudge: created.isHeadJudge,
      hasSubmittedScorecard: false,
    };
  },

  async unassign(
    actor: ActorContext,
    assignmentId: string,
  ): Promise<{ hadSubmittedScorecard: boolean }> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await judgeAssignmentRepository.findById(assignmentId);
    if (!row) throw new AppError("NOT_FOUND", "배정을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    let hadSubmittedScorecard = false;
    if (row.credentialId) {
      const card = await judgeScorecardRepository.findByMatchAndCredential(
        row.matchId,
        row.credentialId,
      );
      hadSubmittedScorecard =
        card?.status === "submitted" || card?.status === "locked";
    }

    await judgeAssignmentRepository.deactivate(assignmentId);
    return { hadSubmittedScorecard };
  },

  async assertJudgeAssignedToMatch(
    session: ResolvedJudgeSession,
    matchId: string,
  ): Promise<void> {
    const assignments = await judgeAssignmentRepository.listByCredential(
      session.credentialId,
    );
    const ok = assignments.some(
      (a) => a.matchId === matchId && a.isActive && a.eventId === session.eventId,
    );
    if (!ok) {
      throw new AppError("FORBIDDEN", "배정되지 않은 경기입니다.");
    }
  },
};
