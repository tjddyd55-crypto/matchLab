/**
 * Stage 4 회원 전용 포털 SSOT.
 * - portal token (Gym 입구) ≠ member session (확인된 GymMember)
 * - 참석/취소는 gymGroupClassService.joinAsMember / cancelAsMember 재사용
 */
import "server-only";

import { randomBytes } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  AuditAction,
  GymGroupClassParticipationStatus,
  GymMemberStatus,
  GymPersonalScheduleStatus,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalOwnerManage } from "@/lib/gym-portal-access";
import {
  GYM_MEMBER_PORTAL_GENERIC_VERIFY_ERROR,
  GYM_MEMBER_PORTAL_INVALID_LINK_MESSAGE,
  GYM_MEMBER_PORTAL_OVERLAP_ERROR,
} from "@/lib/gym-member-portal/constants";
import { gymMemberPortalNamesEqual } from "@/lib/gym-member-portal/identity";
import {
  checkGymMemberPortalActionRateLimit,
  checkGymMemberPortalRateLimit,
  recordGymMemberPortalVerifyFailure,
} from "@/lib/gym-member-portal/rate-limit";
import {
  GYM_MEMBER_PORTAL_SESSION_TTL_MS,
  clearGymMemberPortalSessionCookie,
  readGymMemberPortalSessionCookie,
  setGymMemberPortalSessionCookie,
} from "@/lib/gym-member-portal/session-cookie";
import {
  buildGymMemberPortalUrl,
  generateGymMemberPortalToken,
  hashGymMemberPortalToken,
  hashPortalPhoneKey,
  maskPortalPhoneDisplay,
} from "@/lib/gym-member-portal/token";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  assertClassRangeWithinLimit,
  formatSeoulDateKeyLongKo,
} from "@/lib/gym-member-portal/class-calendar";
import type { MemberPortalGroupClassItem } from "@/lib/gym-member-portal/class-types";
import {
  formatSeoulScheduleRange,
  formatSeoulScheduleTime,
  getSeoulDayRange,
  getSeoulScheduleWeekRange,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import { normalizePhoneDigits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { createGymMemberImageSignedReadUrlForPath } from "@/lib/services/gym-member-image.service";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";

function hashSessionToken(raw: string): string {
  return hashGymMemberPortalToken(raw);
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

const PUBLIC_TOKEN_UNIQUE_RETRIES = 5;

async function allocateUniquePublicToken(): Promise<{
  rawToken: string;
  publicTokenHash: string;
}> {
  for (let attempt = 0; attempt < PUBLIC_TOKEN_UNIQUE_RETRIES; attempt += 1) {
    const rawToken = generateGymMemberPortalToken();
    const publicTokenHash = hashGymMemberPortalToken(rawToken);
    const clash = await prisma.gymMemberPortal.findFirst({
      where: {
        OR: [{ publicToken: rawToken }, { publicTokenHash }],
      },
      select: { id: true },
    });
    if (!clash) {
      return { rawToken, publicTokenHash };
    }
  }
  throw new AppError("INTERNAL", "공용 링크 토큰 발급에 실패했습니다. 다시 시도해 주세요.");
}

/** 관리자 화면용 — publicToken이 있을 때만 URL 재표시 (레거시는 null) */
function mapOwnerPortalLink(portal: {
  id: string;
  isActive: boolean;
  createdAt: Date;
  lastRotatedAt: Date | null;
  revokedAt: Date | null;
  publicToken: string | null;
}) {
  const hasDisplayableLink = Boolean(portal.publicToken);
  const path = portal.publicToken
    ? buildGymMemberPortalUrl(portal.publicToken)
    : null;
  const url =
    path != null ? `${getAppBaseUrl().replace(/\/$/, "")}${path}` : null;
  return {
    id: portal.id,
    isActive: portal.isActive,
    createdAt: portal.createdAt,
    lastRotatedAt: portal.lastRotatedAt,
    revokedAt: portal.revokedAt,
    path,
    url,
    hasDisplayableLink,
    isLegacyHashOnly: !hasDisplayableLink,
  };
}

export type ResolvedPortal = {
  portalId: string;
  gymId: string;
  gymName: string;
  tokenHashPrefix: string;
};

export type PortalSessionContext = {
  sessionId: string;
  portalId: string;
  gymId: string;
  gymName: string;
  gymMemberId: string;
  memberName: string;
  tokenHashPrefix: string;
};

const MEMBER_STATUS_LABEL: Record<GymMemberStatus, string> = {
  active: "이용 중",
  paused: "휴회",
  withdrawn: "탈퇴",
};

const PT_STATUS_LABEL: Record<GymPersonalScheduleStatus, string> = {
  scheduled: "예정",
  completed: "완료",
  no_show: "노쇼",
  cancelled: "취소",
};

export type { MemberPortalGroupClassItem } from "@/lib/gym-member-portal/class-types";

type ClassRowForPortal = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  instructorStaff: { name: string } | null;
  participations: Array<{
    status: GymGroupClassParticipationStatus;
    gymMemberId: string;
    waitlistOrder: number | null;
  }>;
};

function mapGroupClassForPortal(
  cls: ClassRowForPortal,
  session: PortalSessionContext,
  now: Date,
): MemberPortalGroupClassItem {
  const attendingCount = cls.participations.filter(
    (p) => p.status === GymGroupClassParticipationStatus.attending,
  ).length;
  const waitlistCount = cls.participations.filter(
    (p) => p.status === GymGroupClassParticipationStatus.waitlisted,
  ).length;
  const mine = cls.participations.find(
    (p) => p.gymMemberId === session.gymMemberId,
  );
  const started = cls.startsAt.getTime() <= now.getTime();
  const hasSpace = cls.capacity == null || attendingCount < cls.capacity;
  let action: MemberPortalGroupClassItem["action"] = "none";
  let statusLabel = "신청 가능";
  if (cls.status === "cancelled") {
    statusLabel = "취소됨";
    action = "closed";
  } else if (cls.status === "completed") {
    statusLabel = "종료됨";
    action = "closed";
  } else if (mine?.status === GymGroupClassParticipationStatus.attending) {
    statusLabel = "신청 완료";
    action = started ? "closed" : "cancel_attending";
  } else if (mine?.status === GymGroupClassParticipationStatus.waitlisted) {
    statusLabel =
      mine.waitlistOrder != null
        ? `대기 신청 (${mine.waitlistOrder}번째)`
        : "대기 신청";
    action = started ? "closed" : "cancel_waitlist";
  } else if (started) {
    statusLabel = "신청 마감";
    action = "closed";
  } else if (hasSpace) {
    statusLabel = "신청 가능";
    action = "join";
  } else {
    statusLabel = "정원 마감";
    action = "waitlist";
  }

  const myStatus: MemberPortalGroupClassItem["myStatus"] =
    mine?.status === GymGroupClassParticipationStatus.attending
      ? "attending"
      : mine?.status === GymGroupClassParticipationStatus.waitlisted
        ? "waitlisted"
        : null;

  return {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    dateKey: toSeoulDateKey(cls.startsAt),
    dateLabel: formatSeoulDateKeyLongKo(toSeoulDateKey(cls.startsAt)),
    timeRangeLabel: formatSeoulScheduleRange(cls.startsAt, cls.endsAt),
    startTimeLabel: formatSeoulScheduleTime(cls.startsAt),
    endTimeLabel: formatSeoulScheduleTime(cls.endsAt),
    instructorName: cls.instructorStaff?.name ?? null,
    location: cls.location,
    capacity: cls.capacity,
    attendingCount,
    waitlistCount,
    myStatus,
    myWaitlistOrder: mine?.waitlistOrder ?? null,
    classStatus: cls.status,
    statusLabel,
    canApply: action === "join" || action === "waitlist",
    canCancel:
      action === "cancel_attending" || action === "cancel_waitlist",
    action,
    started,
    isMine: myStatus != null,
  };
}

async function findActivePortalByTokenHash(tokenHash: string) {
  return prisma.gymMemberPortal.findFirst({
    where: {
      publicTokenHash: tokenHash,
      isActive: true,
      revokedAt: null,
    },
    include: {
      gym: { select: { id: true, name: true } },
    },
  });
}

export const gymMemberPortalService = {
  async resolvePortal(
    rawToken: string,
  ): Promise<
    | { ok: true; portal: ResolvedPortal }
    | { ok: false; message: string }
  > {
    const trimmed = rawToken.trim();
    if (!trimmed || trimmed.length < 32) {
      return { ok: false, message: GYM_MEMBER_PORTAL_INVALID_LINK_MESSAGE };
    }
    const tokenHash = hashGymMemberPortalToken(trimmed);
    const row = await findActivePortalByTokenHash(tokenHash);
    if (!row) {
      return { ok: false, message: GYM_MEMBER_PORTAL_INVALID_LINK_MESSAGE };
    }
    return {
      ok: true,
      portal: {
        portalId: row.id,
        gymId: row.gymId,
        gymName: row.gym.name,
        tokenHashPrefix: tokenHash.slice(0, 12),
      },
    };
  },

  async getOwnerPortalState(actor: ActorContext) {
    const access = await requireGymPortalOwnerManage(actor);
    const portal = await prisma.gymMemberPortal.findFirst({
      where: {
        gymId: access.gymId,
        isActive: true,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    const gym = await prisma.gym.findUnique({
      where: { id: access.gymId },
      select: { name: true },
    });
    if (!portal) {
      return {
        gymId: access.gymId,
        gymName: gym?.name ?? access.gym.name,
        portal: null as null,
      };
    }
    return {
      gymId: access.gymId,
      gymName: gym?.name ?? access.gym.name,
      portal: mapOwnerPortalLink(portal),
    };
  },

  async createPortal(actor: ActorContext) {
    const access = await requireGymPortalOwnerManage(actor);
    const existing = await prisma.gymMemberPortal.findFirst({
      where: {
        gymId: access.gymId,
        isActive: true,
        revokedAt: null,
      },
    });
    if (existing) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이미 활성 회원 전용 링크가 있습니다. 다시 만들기를 사용해 주세요.",
      );
    }
    const { rawToken, publicTokenHash } = await allocateUniquePublicToken();
    const portal = await prisma.gymMemberPortal.create({
      data: {
        gymId: access.gymId,
        publicToken: rawToken,
        publicTokenHash,
        isActive: true,
        createdByUserId: actor.userId,
      },
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_portal_created,
      targetType: "GymMemberPortal",
      targetId: portal.id,
      afterData: { gymId: access.gymId },
    });
    const path = buildGymMemberPortalUrl(rawToken);
    return {
      portalId: portal.id,
      path,
      url: `${getAppBaseUrl().replace(/\/$/, "")}${path}`,
      rawToken,
    };
  },

  async rotatePortalToken(actor: ActorContext) {
    const access = await requireGymPortalOwnerManage(actor);
    const current = await prisma.gymMemberPortal.findFirst({
      where: {
        gymId: access.gymId,
        isActive: true,
        revokedAt: null,
      },
    });
    if (!current) {
      throw new AppError(
        "NOT_FOUND",
        "활성 회원 전용 링크가 없습니다. 먼저 링크를 만들어 주세요.",
      );
    }
    const { rawToken, publicTokenHash } = await allocateUniquePublicToken();
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.gymMemberPortalSession.updateMany({
        where: {
          gymMemberPortalId: current.id,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await tx.gymMemberPortal.update({
        where: { id: current.id },
        data: {
          isActive: false,
          revokedAt: now,
        },
      });
      await tx.gymMemberPortal.create({
        data: {
          gymId: access.gymId,
          publicToken: rawToken,
          publicTokenHash,
          isActive: true,
          createdByUserId: actor.userId,
          lastRotatedAt: now,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_portal_token_rotated,
          targetType: "GymMemberPortal",
          targetId: current.id,
          afterData: { gymId: access.gymId, previousPortalId: current.id },
        },
        tx,
      );
    });

    const created = await prisma.gymMemberPortal.findFirst({
      where: {
        gymId: access.gymId,
        publicTokenHash,
        isActive: true,
        revokedAt: null,
      },
    });
    if (!created) {
      throw new AppError("INTERNAL", "링크 재발급에 실패했습니다.");
    }
    const path = buildGymMemberPortalUrl(rawToken);
    return {
      portalId: created.id,
      path,
      url: `${getAppBaseUrl().replace(/\/$/, "")}${path}`,
      rawToken,
    };
  },

  async revokePortal(actor: ActorContext) {
    const access = await requireGymPortalOwnerManage(actor);
    const current = await prisma.gymMemberPortal.findFirst({
      where: {
        gymId: access.gymId,
        isActive: true,
        revokedAt: null,
      },
    });
    if (!current) {
      throw new AppError("NOT_FOUND", "활성 회원 전용 링크가 없습니다.");
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.gymMemberPortalSession.updateMany({
        where: { gymMemberPortalId: current.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.gymMemberPortal.update({
        where: { id: current.id },
        data: { isActive: false, revokedAt: now },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_portal_revoked,
          targetType: "GymMemberPortal",
          targetId: current.id,
          afterData: { gymId: access.gymId },
        },
        tx,
      );
    });
    return { portalId: current.id };
  },

  async verifyIdentityAndCreateSession(input: {
    rawPortalToken: string;
    name: string;
    phone: string;
    ip: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    const resolved = await this.resolvePortal(input.rawPortalToken);
    if (!resolved.ok) {
      return { ok: false, message: resolved.message };
    }
    const { portal } = resolved;
    const normalizedPhone = normalizePhoneDigits(input.phone);
    const phoneHash = hashPortalPhoneKey(normalizedPhone || "empty");

    const rate = checkGymMemberPortalRateLimit({
      portalHashPrefix: portal.tokenHashPrefix,
      ip: input.ip,
      phoneHash,
    });
    if (!rate.ok) {
      return {
        ok: false,
        message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    const failGeneric = async () => {
      const fail = recordGymMemberPortalVerifyFailure({
        portalHashPrefix: portal.tokenHashPrefix,
        phoneHash,
      });
      if (!fail.ok) {
        return {
          ok: false as const,
          message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        };
      }
      return {
        ok: false as const,
        message: GYM_MEMBER_PORTAL_GENERIC_VERIFY_ERROR,
      };
    };

    if (!input.name.trim() || normalizedPhone.length < 8) {
      return failGeneric();
    }

    const candidates = await prisma.gymMember.findMany({
      where: {
        gymId: portal.gymId,
        deletedAt: null,
        normalizedPhone,
        status: GymMemberStatus.active,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
      take: 5,
    });

    const matched = candidates.filter((m) =>
      gymMemberPortalNamesEqual(input.name, m.name),
    );

    if (matched.length !== 1) {
      return failGeneric();
    }

    const member = matched[0]!;
    const rawSession = generateSessionToken();
    const sessionTokenHash = hashSessionToken(rawSession);
    const expiresAt = new Date(Date.now() + GYM_MEMBER_PORTAL_SESSION_TTL_MS);

    await prisma.gymMemberPortalSession.create({
      data: {
        gymMemberPortalId: portal.portalId,
        gymId: portal.gymId,
        gymMemberId: member.id,
        sessionTokenHash,
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

    await setGymMemberPortalSessionCookie(rawSession);
    return { ok: true };
  },

  async requireSession(
    rawPortalToken: string,
  ): Promise<PortalSessionContext | null> {
    const resolved = await this.resolvePortal(rawPortalToken);
    if (!resolved.ok) return null;
    const rawSession = await readGymMemberPortalSessionCookie();
    if (!rawSession) return null;

    const sessionTokenHash = hashSessionToken(rawSession);
    const session = await prisma.gymMemberPortalSession.findFirst({
      where: {
        sessionTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        gymMemberPortalId: resolved.portal.portalId,
        gymId: resolved.portal.gymId,
      },
      include: {
        gymMember: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!session) return null;
    if (
      session.gymMember.deletedAt ||
      session.gymMember.status !== GymMemberStatus.active
    ) {
      return null;
    }

    await prisma.gymMemberPortalSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      sessionId: session.id,
      portalId: resolved.portal.portalId,
      gymId: resolved.portal.gymId,
      gymName: resolved.portal.gymName,
      gymMemberId: session.gymMemberId,
      memberName: session.gymMember.name,
      tokenHashPrefix: resolved.portal.tokenHashPrefix,
    };
  },

  async destroySession(rawPortalToken?: string): Promise<void> {
    const now = new Date();
    const rawSession = await readGymMemberPortalSessionCookie();
    if (rawSession) {
      const sessionTokenHash = hashSessionToken(rawSession);
      await prisma.gymMemberPortalSession.updateMany({
        where: { sessionTokenHash },
        data: { revokedAt: now },
      });
    }
    // cookie 미전송/미일치 대비 — portal token으로 활성 세션을 추가 폐기하지는 않음
    // (다른 기기 세션까지 끊지 않기 위함). 쿠키 clear는 항상 수행.
    void rawPortalToken;
    await clearGymMemberPortalSessionCookie();
  },

  async getHome(session: PortalSessionContext) {
    const now = new Date();
    const today = getSeoulDayRange(now);
    const week = getSeoulScheduleWeekRange(now);

    const [ptToday, partsToday, weekClassRows, myParts] = await Promise.all([
      prisma.gymPersonalSchedule.findMany({
        where: {
          gymId: session.gymId,
          gymMemberId: session.gymMemberId,
          deletedAt: null,
          startsAt: { gte: today.start, lt: today.endExclusive },
          status: { in: ["scheduled", "completed", "no_show"] },
        },
        include: {
          gymStaff: { select: { name: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.gymGroupClassParticipation.findMany({
        where: {
          gymId: session.gymId,
          gymMemberId: session.gymMemberId,
          status: { in: ["attending", "waitlisted"] },
          gymGroupClass: {
            deletedAt: null,
            startsAt: { gte: today.start, lt: today.endExclusive },
          },
        },
        include: {
          gymGroupClass: {
            include: {
              instructorStaff: { select: { name: true } },
            },
          },
        },
      }),
      prisma.gymGroupClass.findMany({
        where: {
          gymId: session.gymId,
          deletedAt: null,
          status: "scheduled",
          visibility: { in: ["members_only", "public"] },
          startsAt: { gte: week.start, lt: week.endExclusive },
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.gymGroupClassParticipation.count({
        where: {
          gymId: session.gymId,
          gymMemberId: session.gymMemberId,
          status: { in: ["attending", "waitlisted"] },
          gymGroupClass: {
            deletedAt: null,
            status: "scheduled",
            startsAt: { gte: new Date() },
          },
        },
      }),
    ]);

    const nextPt = await prisma.gymPersonalSchedule.findFirst({
      where: {
        gymId: session.gymId,
        gymMemberId: session.gymMemberId,
        deletedAt: null,
        status: "scheduled",
        startsAt: { gte: new Date() },
      },
      include: { gymStaff: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    });

    type TodayItem = {
      startsAt: Date;
      endsAt: Date;
      kind: "pt" | "group";
      title: string;
      subtitle: string;
      statusLabel: string;
    };

    const todayItems: TodayItem[] = [
      ...ptToday.map((r) => ({
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        kind: "pt" as const,
        title: "개인 PT",
        subtitle: `${r.gymStaff.name} 선생님`,
        statusLabel: PT_STATUS_LABEL[r.status],
      })),
      ...partsToday.map((p) => ({
        startsAt: p.gymGroupClass.startsAt,
        endsAt: p.gymGroupClass.endsAt,
        kind: "group" as const,
        title: p.gymGroupClass.title,
        subtitle:
          p.gymGroupClass.instructorStaff?.name
            ? `${p.gymGroupClass.instructorStaff.name} 선생님`
            : "그룹수업",
        statusLabel:
          p.status === "attending" ? "참석 예정" : "대기 중",
      })),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const remainingWeekClasses = weekClassRows.filter(
      (row) => row.startsAt.getTime() >= now.getTime(),
    );
    const weekClassSummaryItems = remainingWeekClasses.slice(0, 3).map((row) => {
      const dateKey = toSeoulDateKey(row.startsAt);
      return {
        id: row.id,
        title: row.title,
        dateKey,
        dateLabel: formatSeoulDateKeyLongKo(dateKey),
        timeRangeLabel: formatSeoulScheduleRange(row.startsAt, row.endsAt),
        startTimeLabel: formatSeoulScheduleTime(row.startsAt),
      };
    });

    return {
      gymName: session.gymName,
      memberName: session.memberName,
      todayItems: todayItems.map((item) => ({
        ...item,
        timeRangeLabel: formatSeoulScheduleRange(item.startsAt, item.endsAt),
        dateKey: toSeoulDateKey(item.startsAt),
      })),
      nextPt: nextPt
        ? {
            title: nextPt.title,
            timeRangeLabel: formatSeoulScheduleRange(
              nextPt.startsAt,
              nextPt.endsAt,
            ),
            dateKey: toSeoulDateKey(nextPt.startsAt),
            instructorName: nextPt.gymStaff.name,
            location: nextPt.location,
          }
        : null,
      /** 이번 주 남은(시작 전) scheduled 그룹수업 수 */
      weekClassCount: remainingWeekClasses.length,
      weekClassSummaryItems,
      myActiveParticipationCount: myParts,
    };
  },

  async listPersonalSchedules(
    session: PortalSessionContext,
    mode: "upcoming" | "past",
  ) {
    const now = new Date();
    const rows = await prisma.gymPersonalSchedule.findMany({
      where: {
        gymId: session.gymId,
        gymMemberId: session.gymMemberId,
        deletedAt: null,
        ...(mode === "upcoming"
          ? {
              status: "scheduled",
              startsAt: { gte: now },
            }
          : {
              OR: [
                { startsAt: { lt: now } },
                { status: { in: ["completed", "no_show", "cancelled"] } },
              ],
            }),
      },
      include: { gymStaff: { select: { name: true } } },
      orderBy: { startsAt: mode === "upcoming" ? "asc" : "desc" },
      take: 50,
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      scheduleType: r.scheduleType,
      dateKey: toSeoulDateKey(r.startsAt),
      timeRangeLabel: formatSeoulScheduleRange(r.startsAt, r.endsAt),
      instructorName: r.gymStaff.name,
      location: r.location,
      status: r.status,
      statusLabel: PT_STATUS_LABEL[r.status],
      // memo 의도적 미포함
    }));
  },

  async listGroupClasses(
    session: PortalSessionContext,
    range?: { from: Date; toExclusive: Date },
  ) {
    const now = new Date();
    const resolved = range ?? (() => {
      const week = getSeoulScheduleWeekRange(now);
      return { from: week.start, toExclusive: week.endExclusive };
    })();
    assertClassRangeWithinLimit(resolved.from, resolved.toExclusive);

    const classes = await prisma.gymGroupClass.findMany({
      where: {
        gymId: session.gymId,
        deletedAt: null,
        visibility: { in: ["members_only", "public"] },
        startsAt: { gte: resolved.from, lt: resolved.toExclusive },
        status: { in: ["scheduled", "completed", "cancelled"] },
      },
      include: {
        instructorStaff: { select: { name: true } },
        participations: {
          where: {
            status: {
              in: [
                GymGroupClassParticipationStatus.attending,
                GymGroupClassParticipationStatus.waitlisted,
              ],
            },
          },
          select: {
            status: true,
            gymMemberId: true,
            waitlistOrder: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    return classes.map((cls) => mapGroupClassForPortal(cls, session, now));
  },

  /** 단일 수업 상세 — gym scope 강제 */
  async getGroupClass(
    session: PortalSessionContext,
    classId: string,
  ): Promise<MemberPortalGroupClassItem | null> {
    const now = new Date();
    const cls = await prisma.gymGroupClass.findFirst({
      where: {
        id: classId,
        gymId: session.gymId,
        deletedAt: null,
        visibility: { in: ["members_only", "public"] },
      },
      include: {
        instructorStaff: { select: { name: true } },
        participations: {
          where: {
            status: {
              in: [
                GymGroupClassParticipationStatus.attending,
                GymGroupClassParticipationStatus.waitlisted,
              ],
            },
          },
          select: {
            status: true,
            gymMemberId: true,
            waitlistOrder: true,
          },
        },
      },
    });
    if (!cls) return null;
    return mapGroupClassForPortal(cls, session, now);
  },

  async listMyParticipations(session: PortalSessionContext) {
    const rows = await prisma.gymGroupClassParticipation.findMany({
      where: {
        gymId: session.gymId,
        gymMemberId: session.gymMemberId,
        status: { in: ["attending", "waitlisted", "cancelled"] },
      },
      include: {
        gymGroupClass: {
          include: { instructorStaff: { select: { name: true } } },
        },
      },
      orderBy: { respondedAt: "desc" },
      take: 80,
    });

    const now = new Date();
    return rows.map((p) => {
      const cls = p.gymGroupClass;
      const past = cls.endsAt.getTime() < now.getTime() || cls.status !== "scheduled";
      const started = cls.startsAt.getTime() <= now.getTime();
      let bucket: "attending" | "waitlisted" | "cancelled" | "past" = "past";
      if (!past && p.status === "attending") bucket = "attending";
      else if (!past && p.status === "waitlisted") bucket = "waitlisted";
      else if (p.status === "cancelled") bucket = "cancelled";
      else bucket = "past";

      return {
        classId: cls.id,
        title: cls.title,
        dateKey: toSeoulDateKey(cls.startsAt),
        timeRangeLabel: formatSeoulScheduleRange(cls.startsAt, cls.endsAt),
        instructorName: cls.instructorStaff?.name ?? null,
        location: cls.location,
        status: p.status,
        waitlistOrder: p.waitlistOrder,
        bucket,
        canCancel:
          !started &&
          cls.status === "scheduled" &&
          (p.status === "attending" || p.status === "waitlisted"),
      };
    });
  },

  async getProfile(session: PortalSessionContext) {
    const member = await prisma.gymMember.findFirst({
      where: {
        id: session.gymMemberId,
        gymId: session.gymId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        normalizedPhone: true,
        status: true,
        profileImagePath: true,
        staffAssignments: {
          where: { isPrimary: true, endedAt: null, deletedAt: null },
          take: 1,
          include: { gymStaff: { select: { name: true } } },
        },
        subscriptions: {
          where: { status: "active" },
          orderBy: { endsAt: "desc" },
          take: 1,
          select: {
            planNameSnapshot: true,
            endsAt: true,
            status: true,
          },
        },
      },
    });
    if (!member) {
      throw new AppError("NOT_FOUND", "회원 정보를 찾을 수 없습니다.");
    }

    let profileImageUrl: string | null = null;
    if (member.profileImagePath) {
      profileImageUrl = await createGymMemberImageSignedReadUrlForPath(
        session.gymId,
        member.profileImagePath,
      );
    }

    const sub = member.subscriptions[0] ?? null;
    return {
      name: member.name,
      phoneMasked: maskPortalPhoneDisplay(member.normalizedPhone),
      status: member.status,
      statusLabel: MEMBER_STATUS_LABEL[member.status],
      profileImageUrl,
      nameInitial: member.name.trim().charAt(0) || "회",
      primaryStaffName: member.staffAssignments[0]?.gymStaff.name ?? null,
      membershipPlanName: sub?.planNameSnapshot ?? null,
      membershipEndsAt: sub?.endsAt ?? null,
    };
  },

  async joinClass(
    session: PortalSessionContext,
    classId: string,
    ip: string,
  ) {
    const rate = checkGymMemberPortalActionRateLimit({
      portalHashPrefix: session.tokenHashPrefix,
      ip,
      sessionIdPrefix: session.sessionId.slice(0, 12),
    });
    if (!rate.ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const existing = await prisma.gymGroupClassParticipation.findUnique({
      where: {
        gymGroupClassId_gymMemberId: {
          gymGroupClassId: classId,
          gymMemberId: session.gymMemberId,
        },
      },
      select: { status: true },
    });
    if (existing?.status === "attending") {
      return { kind: "already_attending" as const, message: "이미 참석 신청됨" };
    }
    if (existing?.status === "waitlisted") {
      return { kind: "already_waitlisted" as const, message: "이미 대기 중" };
    }

    const result = await gymGroupClassService.joinAsMember({
      gymId: session.gymId,
      classId,
      gymMemberId: session.gymMemberId,
      actorUserId: null,
      requireNotStarted: true,
      overlapMessage: GYM_MEMBER_PORTAL_OVERLAP_ERROR,
    });

    if (result.alreadyAttending) {
      return { kind: "already_attending" as const, message: "이미 참석 신청됨" };
    }
    if (result.status === "attending") {
      return { kind: "attending" as const, message: "참석 신청 완료" };
    }
    return { kind: "waitlisted" as const, message: "대기 신청 완료" };
  },

  async cancelClass(
    session: PortalSessionContext,
    classId: string,
    ip: string,
  ) {
    const rate = checkGymMemberPortalActionRateLimit({
      portalHashPrefix: session.tokenHashPrefix,
      ip,
      sessionIdPrefix: session.sessionId.slice(0, 12),
    });
    if (!rate.ok) {
      throw new AppError(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const part = await prisma.gymGroupClassParticipation.findUnique({
      where: {
        gymGroupClassId_gymMemberId: {
          gymGroupClassId: classId,
          gymMemberId: session.gymMemberId,
        },
      },
      select: { status: true },
    });
    if (!part || (part.status !== "attending" && part.status !== "waitlisted")) {
      throw new AppError("VALIDATION_ERROR", "취소할 참석 정보가 없습니다.");
    }

    await gymGroupClassService.cancelAsMember({
      gymId: session.gymId,
      classId,
      gymMemberId: session.gymMemberId,
      actorUserId: null,
      requireNotStarted: true,
    });

    return {
      kind: part.status === "attending" ? ("cancelled_attending" as const) : ("cancelled_waitlist" as const),
      message:
        part.status === "attending"
          ? "참석 신청이 취소되었습니다."
          : "대기 신청이 취소되었습니다.",
    };
  },
};
