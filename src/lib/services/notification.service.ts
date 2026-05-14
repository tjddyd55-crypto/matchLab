import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  ApplicationStatus,
  NotificationType,
  PaymentStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { notificationRepository } from "@/lib/repositories/notification.repository";

/**
 * MVP 알림 정책: 생성 실패 시 호출부 트랜잭션 전체를 롤백하여 도메인 상태와 인앱 알림을 함께 맞춘다.
 * 향후 비동기 큐·카카오 등 외부 채널 연동 시에는 분리·재시도 전략을 별도 설계한다.
 */

function paymentShortLabel(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.paid:
      return "입금 확인 완료";
    case PaymentStatus.pending_check:
      return "입금 확인 필요";
    case PaymentStatus.refunded:
      return "환불 처리됨";
    case PaymentStatus.waived:
      return "참가비 면제";
    case PaymentStatus.unpaid:
      return "미입금";
    default:
      return "입금 상태 변경";
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

async function pushMatchStakeholderNotifications(input: {
  eventId: string;
  publicSlug: string;
  bracketTitle: string;
  matchId: string;
  summaryLine: string;
  type: NotificationType;
  titleSuffix: string;
  href: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const fighterIds = await notificationRepository.findMatchCornerFighterIds(
    input.matchId,
    input.tx,
  );
  const userIds =
    await notificationRepository.resolveNotifyUserIdsForFighterIds(
      fighterIds,
      input.tx,
    );
  if (userIds.length === 0) return;

  await notificationRepository.createManyNotifications(
    userIds.map((userId) => ({
      userId,
      eventId: input.eventId,
      type: input.type,
      title: `${input.bracketTitle} · ${input.titleSuffix}`,
      content: input.summaryLine,
      href: input.href,
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
  async notifyApplicationStatusChanged(
    input: {
      applicationId: string;
      eventId: string;
      eventTitle: string;
      publicSlug: string;
      /** 승인·반려 후 상태 */
      status: ApplicationStatus;
      gymOwnerUserId: string;
      fighterUserId: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const summary = applicationShortLabel(input.status);
    const hrefGym = "/gym/applications";
    const hrefFighter = "/fighter/events";

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
        href: userId === input.gymOwnerUserId ? hrefGym : hrefFighter,
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
        href: "/gym/applications",
      },
      tx,
    );
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
      /** reset 등 매치 삭제 전 코너 스냅샷 */
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

    const userIds =
      await notificationRepository.resolveNotifyUserIdsForFighterIds(
        fighterIds,
        tx,
      );
    if (userIds.length === 0) return;

    const href = `/events/${input.publicSlug}/brackets`;
    await notificationRepository.createManyNotifications(
      userIds.map((userId) => ({
        userId,
        eventId: input.eventId,
        type: NotificationType.bracket_changed,
        title: `${input.bracketTitle} · 대진표`,
        content: input.summaryLine,
        href,
      })),
      tx,
    );
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
    await pushMatchStakeholderNotifications({
      ...input,
      type: NotificationType.match_changed,
      titleSuffix: "경기",
      href: `/events/${input.publicSlug}/brackets`,
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
    const userIds =
      await notificationRepository.resolveNotifyUserIdsForFighterIds(
        [input.redFighterId, input.blueFighterId],
        tx,
      );
    if (userIds.length === 0) return;

    const hrefResults = `/events/${input.publicSlug}/results`;
    await notificationRepository.createManyNotifications(
      userIds.map((userId) => ({
        userId,
        eventId: input.eventId,
        type: NotificationType.result_confirmed,
        title: `${input.bracketTitle} · 결과 확정`,
        content: input.summaryLine,
        href: hrefResults,
      })),
      tx,
    );
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
    await pushMatchStakeholderNotifications({
      eventId: input.eventId,
      publicSlug: input.publicSlug,
      bracketTitle: input.bracketTitle,
      matchId: input.matchId,
      summaryLine: "공식 경기 결과가 정정되었습니다.",
      type: NotificationType.match_changed,
      titleSuffix: "결과 정정",
      href: `/events/${input.publicSlug}/results`,
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
    await pushMatchStakeholderNotifications({
      eventId: input.eventId,
      publicSlug: input.publicSlug,
      bracketTitle: input.bracketTitle,
      matchId: input.matchId,
      summaryLine: "공식 경기 결과가 무효 처리되었습니다.",
      type: NotificationType.match_changed,
      titleSuffix: "결과 무효",
      href: `/events/${input.publicSlug}/results`,
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
