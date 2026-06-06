import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  ApplicationStatus,
  CheckInStatus,
  NotificationType,
  PaymentStatus,
  WeighInStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { computeFieldEligibility, getCheckInStatusLabel, getWeighInStatusLabel } from "@/lib/field-eligibility";
import { AppError } from "@/lib/errors/app-error";
import {
  fighterEventsHref,
  gymEventStatusHref,
  organizerApplicationsHref,
  organizerBracketsHref,
  publicBracketsHref,
  publicResultsHref,
} from "@/lib/notifications/notification-hrefs";
import { notificationRepository } from "@/lib/repositories/notification.repository";

/**
 * MVP 알림 정책: 생성은 best-effort — 호출부는 `safeNotify`로 감싸 원래 액션 성공을 유지한다.
 * 향후 비동기 큐·카카오 등 외부 채널 연동 시 재시도 전략을 별도 설계한다.
 */

function paymentShortLabel(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.paid:
      return "입금이 확인되었습니다.";
    case PaymentStatus.pending_check:
      return "입금 확인이 필요합니다.";
    case PaymentStatus.refunded:
      return "환불 처리되었습니다.";
    case PaymentStatus.waived:
      return "참가비가 면제 처리되었습니다.";
    case PaymentStatus.unpaid:
      return "입금이 확인되지 않았습니다.";
    default:
      return "입금 상태가 변경되었습니다.";
  }
}

function applicationShortLabel(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.approved:
      return "신청이 승인되었습니다.";
    case ApplicationStatus.rejected:
      return "신청이 반려되었습니다.";
    default:
      return "신청 상태가 변경되었습니다.";
  }
}

function uniqueUsers(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((x): x is string => Boolean(x?.trim())))];
}

function buildFieldStatusContent(input: {
  previousCheckIn: CheckInStatus;
  previousWeighIn: WeighInStatus;
  nextCheckIn: CheckInStatus;
  nextWeighIn: WeighInStatus;
}): string | null {
  const parts: string[] = [];
  if (input.previousCheckIn !== input.nextCheckIn) {
    parts.push(`현장 확인: ${getCheckInStatusLabel(input.nextCheckIn)}`);
  }
  if (input.previousWeighIn !== input.nextWeighIn) {
    parts.push(`계체: ${getWeighInStatusLabel(input.nextWeighIn)}`);
  }
  const prevEligible = computeFieldEligibility({
    checkInStatus: input.previousCheckIn,
    weighInStatus: input.previousWeighIn,
  });
  const nextEligible = computeFieldEligibility({
    checkInStatus: input.nextCheckIn,
    weighInStatus: input.nextWeighIn,
  });
  if (!prevEligible.isEligibleForBracket && nextEligible.isEligibleForBracket) {
    parts.push("출전이 확정되었습니다.");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

async function createStakeholderNotifications(input: {
  eventId: string;
  type: NotificationType;
  title: string;
  content: string;
  fighterIds: string[];
  gymHref: string;
  fighterHref: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const targets = await notificationRepository.resolveStakeholderTargetsForFighters(
    input.fighterIds,
    { gym: input.gymHref, fighter: input.fighterHref },
    input.tx,
  );
  if (targets.length === 0) return;
  await notificationRepository.createManyNotifications(
    targets.map((t) => ({
      userId: t.userId,
      eventId: input.eventId,
      type: input.type,
      title: input.title,
      content: input.content,
      href: t.href,
    })),
    input.tx,
  );
}

export type NotificationListItemDTO = {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  eventId: string | null;
};

export const notificationService = {
  async notifyApplicationSubmitted(
    input: {
      eventId: string;
      eventTitle: string;
      count?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const organizerUserId =
      await notificationRepository.resolveOrganizerUserIdForEvent(
        input.eventId,
        tx,
      );
    if (!organizerUserId) return;

    const countLabel =
      input.count && input.count > 1
        ? `새 신청 ${input.count}건이 접수되었습니다.`
        : "새 신청이 접수되었습니다.";

    await notificationRepository.createNotification(
      {
        userId: organizerUserId,
        eventId: input.eventId,
        type: NotificationType.event_notice,
        title: `${input.eventTitle} · 신청`,
        content: countLabel,
        href: organizerApplicationsHref(input.eventId),
      },
      tx,
    );
  },

  async notifyApplicationStatusChanged(
    input: {
      applicationId: string;
      eventId: string;
      eventTitle: string;
      status: ApplicationStatus;
      gymOwnerUserId: string;
      fighterUserId: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const summary = applicationShortLabel(input.status);
    const targets = uniqueUsers([
      input.gymOwnerUserId,
      input.fighterUserId ?? undefined,
    ]);

    await notificationRepository.createManyNotifications(
      targets.map((userId) => ({
        userId,
        eventId: input.eventId,
        type: NotificationType.application_status_changed,
        title: `${input.eventTitle} · 신청`,
        content: summary,
        href:
          userId === input.gymOwnerUserId
            ? gymEventStatusHref(input.eventId)
            : fighterEventsHref(),
      })),
      tx,
    );
  },

  async notifyPaymentStatusChanged(
    input: {
      eventId: string;
      eventTitle: string;
      gymOwnerUserId: string;
      paymentStatus: PaymentStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await notificationRepository.createNotification(
      {
        userId: input.gymOwnerUserId,
        eventId: input.eventId,
        type: NotificationType.payment_status_changed,
        title: `${input.eventTitle} · 입금`,
        content: paymentShortLabel(input.paymentStatus),
        href: gymEventStatusHref(input.eventId),
      },
      tx,
    );
  },

  async notifyFieldStatusChanged(
    input: {
      eventId: string;
      eventTitle: string;
      fighterId: string;
      gymOwnerUserId: string;
      fighterUserId: string | null;
      previousCheckIn: CheckInStatus;
      previousWeighIn: WeighInStatus;
      nextCheckIn: CheckInStatus;
      nextWeighIn: WeighInStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const content = buildFieldStatusContent({
      previousCheckIn: input.previousCheckIn,
      previousWeighIn: input.previousWeighIn,
      nextCheckIn: input.nextCheckIn,
      nextWeighIn: input.nextWeighIn,
    });
    if (!content) return;

    const targets = uniqueUsers([
      input.gymOwnerUserId,
      input.fighterUserId ?? undefined,
    ]);

    await notificationRepository.createManyNotifications(
      targets.map((userId) => ({
        userId,
        eventId: input.eventId,
        type: NotificationType.event_notice,
        title: `${input.eventTitle} · 현장/계체`,
        content,
        href:
          userId === input.gymOwnerUserId
            ? gymEventStatusHref(input.eventId)
            : fighterEventsHref(),
      })),
      tx,
    );
  },

  async notifyBracketAutoGenerated(
    input: {
      eventId: string;
      eventTitle: string;
      createdMatches: number;
      unmatchedCount: number;
      placedFighterIds: string[];
      unmatchedGymIds: string[];
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const organizerUserId =
      await notificationRepository.resolveOrganizerUserIdForEvent(
        input.eventId,
        tx,
      );

    const rows: Array<{
      userId: string;
      eventId: string;
      type: NotificationType;
      title: string;
      content: string;
      href: string;
    }> = [];

    if (organizerUserId) {
      rows.push({
        userId: organizerUserId,
        eventId: input.eventId,
        type: NotificationType.bracket_changed,
        title: `${input.eventTitle} · 대진 생성`,
        content:
          input.createdMatches > 0
            ? `자동 대진이 생성되었습니다. (경기 ${input.createdMatches}건)`
            : "자동 대진 생성이 완료되었습니다.",
        href: organizerBracketsHref(input.eventId),
      });
    }

    if (input.placedFighterIds.length > 0) {
      const placedTargets =
        await notificationRepository.resolveStakeholderTargetsForFighters(
          input.placedFighterIds,
          {
            gym: gymEventStatusHref(input.eventId),
            fighter: fighterEventsHref(),
          },
          tx,
        );
      for (const t of placedTargets) {
        rows.push({
          userId: t.userId,
          eventId: input.eventId,
          type: NotificationType.bracket_changed,
          title: `${input.eventTitle} · 대진 배정`,
          content: "소속 선수가 대진에 배정되었습니다.",
          href: t.href,
        });
      }
    }

    if (input.unmatchedGymIds.length > 0) {
      const gymTargets = await notificationRepository.resolveGymOwnerTargets(
        input.unmatchedGymIds,
        gymEventStatusHref(input.eventId),
        tx,
      );
      for (const t of gymTargets) {
        rows.push({
          userId: t.userId,
          eventId: input.eventId,
          type: NotificationType.bracket_changed,
          title: `${input.eventTitle} · 대기`,
          content: "일부 선수는 대기·미배정 상태입니다.",
          href: t.href,
        });
      }
    }

    if (rows.length === 0) return;
    await notificationRepository.createManyNotifications(rows, tx);
  },

  async notifyBracketPublished(
    input: {
      eventId: string;
      eventTitle: string;
      publicSlug: string;
      bracketTitle: string;
      fighterIds: string[];
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (input.fighterIds.length === 0) return;

    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.bracket_changed,
      title: `${input.bracketTitle} · 대진표`,
      content: "대진표가 공개되었습니다.",
      fighterIds: input.fighterIds,
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: fighterEventsHref(),
      tx,
    });
  },

  async notifyBracketChanged(
    input: {
      eventId: string;
      publicSlug: string;
      bracketId: string;
      bracketTitle: string;
      summaryLine: string;
      scope: "bracket_all" | "match";
      matchId?: string;
      fighterIdsOverride?: string[];
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    let fighterIds: string[];
    if (input.fighterIdsOverride?.length) {
      fighterIds = [...new Set(input.fighterIdsOverride)];
    } else if (input.scope === "match" && input.matchId) {
      fighterIds = await notificationRepository.findMatchCornerFighterIds(
        input.matchId,
        tx,
      );
    } else {
      fighterIds = await notificationRepository.listCornerFighterIdsForBracket(
        input.bracketId,
        tx,
      );
    }

    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.bracket_changed,
      title: `${input.bracketTitle} · 대진표`,
      content: input.summaryLine,
      fighterIds,
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: publicBracketsHref(input.publicSlug),
      tx,
    });
  },

  async notifyMatchChanged(
    input: {
      eventId: string;
      publicSlug: string;
      bracketTitle: string;
      matchId: string;
      summaryLine: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const fighterIds = await notificationRepository.findMatchCornerFighterIds(
      input.matchId,
      tx,
    );
    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.match_changed,
      title: `${input.bracketTitle} · 경기`,
      content: input.summaryLine,
      fighterIds,
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: fighterEventsHref(),
      tx,
    });
  },

  async notifyResultConfirmed(
    input: {
      eventId: string;
      publicSlug: string;
      bracketTitle: string;
      matchId: string;
      redFighterId: string;
      blueFighterId: string;
      summaryLine: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.result_confirmed,
      title: `${input.bracketTitle} · 결과 확정`,
      content: input.summaryLine,
      fighterIds: [input.redFighterId, input.blueFighterId],
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: fighterEventsHref(),
      tx,
    });
  },

  async notifyOfficialResultAdjusted(
    input: {
      eventId: string;
      publicSlug: string;
      bracketTitle: string;
      matchId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const fighterIds = await notificationRepository.findMatchCornerFighterIds(
      input.matchId,
      tx,
    );
    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.match_changed,
      title: `${input.bracketTitle} · 결과 정정`,
      content: "공식 경기 결과가 정정되었습니다.",
      fighterIds,
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: publicResultsHref(input.publicSlug),
      tx,
    });
  },

  async notifyOfficialResultVoided(
    input: {
      eventId: string;
      publicSlug: string;
      bracketTitle: string;
      matchId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const fighterIds = await notificationRepository.findMatchCornerFighterIds(
      input.matchId,
      tx,
    );
    await createStakeholderNotifications({
      eventId: input.eventId,
      type: NotificationType.match_changed,
      title: `${input.bracketTitle} · 결과 무효`,
      content: "공식 경기 결과가 무효 처리되었습니다.",
      fighterIds,
      gymHref: gymEventStatusHref(input.eventId),
      fighterHref: publicResultsHref(input.publicSlug),
      tx,
    });
  },

  async listMyNotifications(actor: ActorContext): Promise<{
    items: NotificationListItemDTO[];
    unreadCount: number;
  }> {
    const [items, unreadCount] = await Promise.all([
      notificationRepository.listNotificationsByUser(actor.userId, 80),
      notificationRepository.countUnreadByUser(actor.userId),
    ]);

    return {
      unreadCount,
      items: items.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        content: r.content,
        href: r.href ?? null,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        eventId: r.eventId ?? null,
      })),
    };
  },

  async markNotificationRead(
    actor: ActorContext,
    notificationId: string,
  ): Promise<void> {
    const ok = await notificationRepository.markNotificationRead(
      notificationId,
      actor.userId,
    );
    if (!ok) {
      throw new AppError("NOT_FOUND", "알림을 찾을 수 없습니다.");
    }
  },

  async markAllNotificationsRead(actor: ActorContext): Promise<void> {
    await notificationRepository.markAllNotificationsRead(actor.userId);
  },
};
