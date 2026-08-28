import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { EventStatus } from "@/lib/enums";
import { requireOrganizerForEvent } from "@/lib/permissions";
import {
  buildEventArchiveFinishSummary,
  buildEventArchiveSnapshots,
} from "@/lib/event-archive/snapshot-builder";
import type {
  EventArchiveApplicantsSnapshot,
  EventArchiveBracketSnapshot,
  EventArchiveEventSnapshot,
  EventArchiveFinishSummary,
  EventArchiveResultsSnapshot,
  EventArchiveSummaryStats,
} from "@/lib/event-archive/types";
import { eventArchiveRepository } from "@/lib/repositories/event-archive.repository";
import { fighterCareerService } from "@/lib/services/fighter-career.service";

const ARCHIVE_VERSION_INITIAL = 1;

export type EventArchiveViewModel = {
  id: string;
  eventId: string;
  version: number;
  archivedAt: string;
  eventSnapshot: EventArchiveEventSnapshot;
  applicantsSnapshot: EventArchiveApplicantsSnapshot;
  bracketSnapshot: EventArchiveBracketSnapshot;
  resultsSnapshot: EventArchiveResultsSnapshot;
  summary: EventArchiveSummaryStats;
};

function parseJson<T>(raw: unknown, label: string): T {
  if (raw == null) {
    throw new AppError("INTERNAL", `${label} snapshot이 없습니다.`);
  }
  return raw as T;
}

function toArchiveViewModel(row: {
  id: string;
  eventId: string;
  version: number;
  archivedAt: Date;
  eventSnapshot: unknown;
  applicantsSnapshot: unknown;
  bracketSnapshot: unknown;
  resultsSnapshot: unknown;
}): EventArchiveViewModel {
  const eventSnapshot = parseJson<EventArchiveEventSnapshot>(
    row.eventSnapshot,
    "event",
  );
  const applicantsSnapshot = parseJson<EventArchiveApplicantsSnapshot>(
    row.applicantsSnapshot,
    "applicants",
  );
  const bracketSnapshot = parseJson<EventArchiveBracketSnapshot>(
    row.bracketSnapshot,
    "bracket",
  );
  const resultsSnapshot = parseJson<EventArchiveResultsSnapshot>(
    row.resultsSnapshot,
    "results",
  );

  const terminalMatches = bracketSnapshot.matches.filter(
    (m) => m.status === "finished" || m.status === "cancelled",
  ).length;

  return {
    id: row.id,
    eventId: row.eventId,
    version: row.version,
    archivedAt: row.archivedAt.toISOString(),
    eventSnapshot,
    applicantsSnapshot,
    bracketSnapshot,
    resultsSnapshot,
    summary: {
      applicantCount: applicantsSnapshot.totalCount,
      participantCount: applicantsSnapshot.participantCount,
      totalMatchCount: bracketSnapshot.totalMatchCount,
      completedMatchCount: terminalMatches,
      divisionCount: bracketSnapshot.divisionCount,
      archivedAt: row.archivedAt.toISOString(),
      version: row.version,
    },
  };
}

export const eventArchiveService = {
  async getFinishSummary(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventArchiveFinishSummary> {
    await requireOrganizerForEvent(actor, eventId);
    return buildEventArchiveFinishSummary(eventId);
  },

  /** 트랜잭션 내 archive 생성 — event 종료와 함께 호출 */
  async createArchiveInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      eventId: string;
      archivedByUserId: string | null;
    },
  ): Promise<{ archiveId: string; created: boolean }> {
    const existing = await eventArchiveRepository.findByEventAndVersion(
      input.eventId,
      ARCHIVE_VERSION_INITIAL,
      tx,
    );
    if (existing) {
      return { archiveId: existing.id, created: false };
    }

    const snapshots = await buildEventArchiveSnapshots(input.eventId);
    const row = await eventArchiveRepository.create(
      {
        eventId: input.eventId,
        version: ARCHIVE_VERSION_INITIAL,
        eventSnapshot: snapshots.eventSnapshot as Prisma.InputJsonValue,
        applicantsSnapshot:
          snapshots.applicantsSnapshot as Prisma.InputJsonValue,
        bracketSnapshot: snapshots.bracketSnapshot as Prisma.InputJsonValue,
        resultsSnapshot: snapshots.resultsSnapshot as Prisma.InputJsonValue,
        archivedByUserId: input.archivedByUserId,
      },
      tx,
    );
    await fighterCareerService.syncFromArchiveInTransaction(tx, {
      eventId: input.eventId,
      eventArchiveId: row.id,
      archiveVersion: ARCHIVE_VERSION_INITIAL,
      eventSnapshot: snapshots.eventSnapshot,
      resultsSnapshot: snapshots.resultsSnapshot,
    });
    return { archiveId: row.id, created: true };
  },

  async getActiveArchive(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventArchiveViewModel | null> {
    await requireOrganizerForEvent(actor, eventId);
    const row = await eventArchiveRepository.findActiveByEventId(eventId);
    if (!row) return null;
    return toArchiveViewModel(row);
  },

  async requireActiveArchive(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventArchiveViewModel> {
    const archive = await this.getActiveArchive(actor, eventId);
    if (!archive) {
      throw new AppError(
        "NOT_FOUND",
        "이 대회는 기록 보관 기능 도입 이전에 종료되었거나, 아직 기록이 생성되지 않았습니다.",
      );
    }
    return archive;
  },

  hasArchiveForFinishedEvent(status: EventStatus): boolean {
    return status === EventStatus.finished;
  },
};
