/**
 * [CONTRACT] PrismaClient import는 repositories 내부에만 허용.
 */
import type { Prisma } from "@/generated/prisma";
import {
  GymMemberStatus,
  GymMemberSubscriptionStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/phone";
import { toUtcDateOnly } from "@/lib/date-only";
import { getSeoulCurrentMonthRange } from "@/lib/gym-attendance/seoul-date";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

/**
 * 이번 달 신규 — GymMember.joinedAt(UTC date-only) SSOT.
 * Asia/Seoul 달력 월 [start, endExclusive).
 */
export function gymMemberJoinedThisMonthFilter(
  at: Date = new Date(),
): Prisma.DateTimeFilter {
  const { start, endExclusive } = getSeoulCurrentMonthRange(at);
  return { gte: start, lt: endExclusive };
}

/** 이름·번호·회원번호 검색. 숫자 없는 q에서 phone contains "" 전건 매칭을 막는다. */
function gymMemberTextSearchOr(q: string): Prisma.GymMemberWhereInput[] {
  const phoneDigits = normalizePhoneDigits(q);
  return [
    { name: { contains: q, mode: "insensitive" } },
    { memberNumber: { contains: q, mode: "insensitive" } },
    ...(phoneDigits
      ? ([
          { phone: { contains: phoneDigits } },
          { normalizedPhone: { contains: phoneDigits } },
        ] as Prisma.GymMemberWhereInput[])
      : []),
  ];
}

export type GymMemberListFilters = {
  gymId: string;
  q?: string;
  status?: GymMemberStatus;
  /** fighter | non_fighter | all */
  fighterFilter?: "all" | "fighter" | "non_fighter";
  /** active | expiring | expired | no_plan | all — computed against today */
  expirationFilter?: "all" | "active" | "expiring" | "expired" | "no_plan";
  /** this-month | all — joinedAt vs Seoul calendar month */
  joinedFilter?: "all" | "this-month";
  /** 회원 그룹 필터 */
  groupId?: string;
  planId?: string;
  skip?: number;
  take?: number;
};

const memberListSelect = {
  id: true,
  gymId: true,
  memberNumber: true,
  name: true,
  phone: true,
  birthDate: true,
  gender: true,
  status: true,
  joinedAt: true,
  primarySport: true,
  rankName: true,
  profileImagePath: true,
  createdAt: true,
  fighter: {
    select: {
      id: true,
      fighterCode: true,
      status: true,
      height: true,
      weight: true,
      primarySport: true,
    },
  },
  subscriptions: {
    where: {
      status: {
        in: [
          GymMemberSubscriptionStatus.active,
          GymMemberSubscriptionStatus.paused,
        ],
      },
    },
    orderBy: { startedAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      planNameSnapshot: true,
      startedAt: true,
      endsAt: true,
      status: true,
      priceSnapshot: true,
    },
  },
} satisfies Prisma.GymMemberSelect;

export type GymMemberListRow = Prisma.GymMemberGetPayload<{
  select: typeof memberListSelect;
}>;

export const gymMemberRepository = {
  async nextMemberNumber(
    gymId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const last = await db(tx).gymMember.findFirst({
      where: { gymId },
      orderBy: { memberNumber: "desc" },
      select: { memberNumber: true },
    });
    let seq = 1;
    if (last?.memberNumber) {
      const m = /^M-(\d+)$/.exec(last.memberNumber);
      if (m) seq = Number(m[1]) + 1;
    }
    return `M-${String(seq).padStart(6, "0")}`;
  },

  async findByIdForGym(memberId: string, gymId: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymMember.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      include: {
        fighter: {
          select: {
            id: true,
            fighterCode: true,
            status: true,
            height: true,
            weight: true,
            primarySport: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
            userId: true,
          },
        },
        subscriptions: {
          orderBy: { startedAt: "desc" },
          include: {
            pauses: { orderBy: { pausedAt: "desc" } },
            plan: { select: { id: true, name: true } },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 50,
        },
      },
    });
  },

  /** 사진 업로드·서명 권한 검사용 최소 조회 */
  async findImageContextForGym(
    memberId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMember.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      select: { id: true, gymId: true, profileImagePath: true },
    });
  },

  async findDuplicateCandidates(
    gymId: string,
    input: {
      phone: string;
      name: string;
      birthDate?: Date | null;
      excludeMemberId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const phone = normalizePhoneDigits(input.phone);
    const rows = await db(tx).gymMember.findMany({
      where: {
        gymId,
        deletedAt: null,
        ...(input.excludeMemberId
          ? { id: { not: input.excludeMemberId } }
          : {}),
        OR: [
          { normalizedPhone: phone },
          { phone: { contains: phone.slice(-8) } },
          ...(input.birthDate
            ? [
                {
                  AND: [
                    { name: input.name.trim() },
                    { birthDate: toUtcDateOnly(input.birthDate) },
                  ],
                },
              ]
            : [{ name: input.name.trim() }]),
        ],
      },
      take: 20,
      select: {
        id: true,
        memberNumber: true,
        name: true,
        phone: true,
        normalizedPhone: true,
        birthDate: true,
        status: true,
        fighter: { select: { id: true } },
      },
    });

    return rows.filter((r) => {
      const samePhone =
        r.normalizedPhone === phone ||
        normalizePhoneDigits(r.phone) === phone;
      const sameNameBirth =
        Boolean(input.birthDate) &&
        r.name.trim() === input.name.trim() &&
        r.birthDate &&
        toUtcDateOnly(r.birthDate).getTime() ===
          toUtcDateOnly(input.birthDate!).getTime();
      // phone match alone is warning-worthy; name+birth also
      return samePhone || sameNameBirth;
    });
  },

  async list(
    filters: GymMemberListFilters,
  ): Promise<{ rows: GymMemberListRow[]; total: number }> {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 30;
    const q = filters.q?.trim();

    const where: Prisma.GymMemberWhereInput = {
      gymId: filters.gymId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.fighterFilter === "fighter"
        ? { fighter: { isNot: null } }
        : filters.fighterFilter === "non_fighter"
          ? { fighter: { is: null } }
          : {}),
      ...(filters.joinedFilter === "this-month"
        ? { joinedAt: gymMemberJoinedThisMonthFilter() }
        : {}),
      ...(filters.groupId
        ? {
            groupAssignments: {
              some: {
                groupId: filters.groupId,
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(filters.planId
        ? {
            subscriptions: {
              some: {
                planId: filters.planId,
                status: {
                  in: [
                    GymMemberSubscriptionStatus.active,
                    GymMemberSubscriptionStatus.paused,
                  ],
                },
              },
            },
          }
        : {}),
      ...(q ? { OR: gymMemberTextSearchOr(q) } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.gymMember.findMany({
        where,
        select: memberListSelect,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.gymMember.count({ where }),
    ]);

    return { rows, total };
  },

  async countSummary(gymId: string) {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const in7 = new Date(today.getTime() + 7 * 86_400_000);
    const joinedThisMonth = gymMemberJoinedThisMonthFilter(now);

    const base = { gymId, deletedAt: null as Date | null };

    const [
      total,
      activeStored,
      paused,
      withdrawn,
      withFighter,
      newThisMonth,
      expiringSubs,
      expiredSubs,
      activeSubs,
    ] = await Promise.all([
      prisma.gymMember.count({ where: base }),
      prisma.gymMember.count({
        where: { ...base, status: GymMemberStatus.active },
      }),
      prisma.gymMember.count({
        where: { ...base, status: GymMemberStatus.paused },
      }),
      prisma.gymMember.count({
        where: { ...base, status: GymMemberStatus.withdrawn },
      }),
      prisma.gymMember.count({
        where: { ...base, fighter: { isNot: null } },
      }),
      prisma.gymMember.count({
        where: { ...base, joinedAt: joinedThisMonth },
      }),
      prisma.gymMember.count({
        where: {
          ...base,
          status: GymMemberStatus.active,
          subscriptions: {
            some: {
              status: GymMemberSubscriptionStatus.active,
              endsAt: { gte: today, lte: in7 },
            },
          },
        },
      }),
      prisma.gymMember.count({
        where: {
          ...base,
          status: GymMemberStatus.active,
          subscriptions: {
            some: {
              status: GymMemberSubscriptionStatus.active,
              endsAt: { lt: today },
            },
          },
        },
      }),
      prisma.gymMember.count({
        where: {
          ...base,
          status: GymMemberStatus.active,
          subscriptions: {
            some: {
              status: GymMemberSubscriptionStatus.active,
              OR: [{ endsAt: null }, { endsAt: { gt: in7 } }],
            },
          },
        },
      }),
    ]);

    return {
      total,
      activeStored,
      paused,
      withdrawn,
      withFighter,
      withoutFighter: total - withFighter,
      newThisMonth,
      expiring: expiringSubs,
      expired: expiredSubs,
      inUse: activeSubs,
    };
  },

  async create(
    data: Prisma.GymMemberCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMember.create({ data });
  },

  async update(
    id: string,
    data: Prisma.GymMemberUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMember.update({ where: { id }, data });
  },

  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymMember.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: GymMemberStatus.withdrawn,
      },
    });
  },

  async findByFighterId(fighterId: string, tx?: Prisma.TransactionClient) {
    return db(tx).fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        gymMemberId: true,
        currentGymId: true,
        gymMember: { select: { id: true, gymId: true, name: true } },
      },
    });
  },

  async listSelectableForFighterPromote(gymId: string, q?: string) {
    return prisma.gymMember.findMany({
      where: {
        gymId,
        deletedAt: null,
        status: { not: GymMemberStatus.withdrawn },
        fighter: { is: null },
        ...(q ? { OR: gymMemberTextSearchOr(q) } : {}),
      },
      take: 30,
      orderBy: { name: "asc" },
      select: {
        id: true,
        memberNumber: true,
        name: true,
        phone: true,
        birthDate: true,
        gender: true,
      },
    });
  },
};
