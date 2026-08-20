/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { FighterStatus, type Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  activeFighterAffiliatedWithGymWhere,
  activeFighterEligibleForEventApplicationWhere,
} from "@/lib/gym-affiliation";
import {
  activeGymHistoryWhere,
  fighterIdentityDayRange,
} from "@/lib/gym-fighter-management";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/phone";
import { toUtcDateOnly } from "@/lib/date-only";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type GymFighterListRow = {
  id: string;
  fighterCode: string;
  name: string;
  gender: string;
  birthDate: Date | null;
  phone: string;
  weight: number | null;
  primarySport: string | null;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
  status: FighterStatus;
  profileImageUrl: string | null;
  affiliationStartDate: Date | null;
  gymInternalMemo: string | null;
  createdAt: Date;
  userId: string | null;
  loginId: string | null;
  mustChangePassword: boolean;
  profileIsPublic: boolean;
  hasFighterProfile: boolean;
  profileSlug: string | null;
};

export type GymFighterEditRow = {
  id: string;
  fighterCode: string;
  name: string;
  birthDate: Date | null;
  gender: string;
  phone: string;
  height: number | null;
  weight: number | null;
  primarySport: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: FighterStatus;
  gymInternalMemo: string | null;
  historyId: string;
};

export type FighterDuplicateCandidate = {
  id: string;
  fighterCode: string;
  phone: string;
  name: string;
};

export const fighterRepository = {
  async findFighterVisibilityContext(fighterId: string): Promise<{
    id: string;
    currentGymId: string | null;
    userId: string | null;
    hasFighterProfile: boolean;
    profileIsPublic: boolean;
    profileSlug: string | null;
  } | null> {
    const row = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        currentGymId: true,
        userId: true,
        fighterProfile: {
          select: { isPublic: true, slug: true },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      currentGymId: row.currentGymId,
      userId: row.userId,
      hasFighterProfile: Boolean(row.fighterProfile),
      profileIsPublic: row.fighterProfile?.isPublic ?? false,
      profileSlug: row.fighterProfile?.slug ?? null,
    };
  },

  async listFightersByGym(gymId: string): Promise<GymFighterListRow[]> {
    return this.listActiveFightersForGymManagement(gymId);
  },

  /** 체육관 관리 화면 — active 소속·active 선수만 */
  async listActiveFightersForGymManagement(
    gymId: string,
  ): Promise<GymFighterListRow[]> {
    const fighters = await prisma.fighter.findMany({
      where: activeFighterAffiliatedWithGymWhere(gymId),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        gender: true,
        birthDate: true,
        phone: true,
        weight: true,
        primarySport: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        status: true,
        profileImageUrl: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            loginId: true,
            mustChangePassword: true,
          },
        },
        fighterProfile: {
          select: { isPublic: true, slug: true, profileImageUrl: true },
        },
        gymHistories: {
          where: activeGymHistoryWhere(gymId),
          orderBy: { startDate: "desc" },
          take: 1,
          select: {
            startDate: true,
            gymInternalMemo: true,
          },
        },
      },
    });

    return fighters.map((f) => ({
      id: f.id,
      fighterCode: f.fighterCode,
      name: f.name,
      gender: f.gender,
      birthDate: f.birthDate,
      phone: f.phone,
      weight: f.weight,
      primarySport: f.primarySport,
      recordWin: f.recordWin,
      recordLoss: f.recordLoss,
      recordDraw: f.recordDraw,
      status: f.status,
      profileImageUrl:
        f.fighterProfile?.profileImageUrl ?? f.profileImageUrl,
      affiliationStartDate: f.gymHistories[0]?.startDate ?? null,
      gymInternalMemo: f.gymHistories[0]?.gymInternalMemo ?? null,
      createdAt: f.createdAt,
      userId: f.userId,
      loginId: f.user?.loginId ?? null,
      mustChangePassword: f.user?.mustChangePassword ?? false,
      profileIsPublic: f.fighterProfile?.isPublic ?? false,
      hasFighterProfile: Boolean(f.fighterProfile),
      profileSlug: f.fighterProfile?.slug ?? null,
    }));
  },

  async findActiveGymHistory(fighterId: string, gymId: string) {
    return prisma.fighterGymHistory.findFirst({
      where: {
        fighterId,
        ...activeGymHistoryWhere(gymId),
      },
    });
  },

  async hasActiveAffiliationAtGym(fighterId: string, gymId: string): Promise<boolean> {
    const row = await this.findActiveGymHistory(fighterId, gymId);
    return Boolean(row);
  },

  /**
   * 체육관 선수 수정 화면 — 목록과 동일한 소속 조건(`activeFighterAffiliatedWithGymWhere`).
   * active history가 없으면 복구 생성(삭제 없음).
   */
  async findFighterEditRowForGym(
    fighterId: string,
    gymId: string,
  ): Promise<GymFighterEditRow | null> {
    const fighter = await prisma.fighter.findFirst({
      where: {
        id: fighterId,
        ...activeFighterAffiliatedWithGymWhere(gymId),
      },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        height: true,
        weight: true,
        primarySport: true,
        guardianName: true,
        guardianPhone: true,
        status: true,
        currentGymId: true,
      },
    });
    if (!fighter) return null;

    let history = await this.findActiveGymHistory(fighterId, gymId);
    if (!history) {
      history = await prisma.fighterGymHistory.create({
        data: { fighterId, gymId, status: "active" },
      });
    }

    if (fighter.currentGymId !== gymId) {
      await prisma.fighter.update({
        where: { id: fighterId },
        data: { currentGymId: gymId },
      });
    }

    return {
      id: fighter.id,
      fighterCode: fighter.fighterCode,
      name: fighter.name,
      birthDate: fighter.birthDate,
      gender: fighter.gender,
      phone: fighter.phone ?? "",
      height: fighter.height,
      weight: fighter.weight,
      primarySport: fighter.primarySport,
      guardianName: fighter.guardianName,
      guardianPhone: fighter.guardianPhone,
      status: fighter.status,
      gymInternalMemo: history.gymInternalMemo,
      historyId: history.id,
    };
  },

  async findIdentityDuplicateCandidates(input: {
    name: string;
    birthDate: Date | null;
    gender: string;
    phone?: string;
    excludeFighterId?: string;
  }): Promise<FighterDuplicateCandidate[]> {
    const normalizedName = input.name.trim();
    const targetPhone = input.phone
      ? normalizePhoneDigits(input.phone)
      : null;

    const rows = await prisma.fighter.findMany({
      where: {
        gender: input.gender,
        ...(input.birthDate
          ? { birthDate: fighterIdentityDayRange(input.birthDate) }
          : { birthDate: null }),
        ...(input.excludeFighterId
          ? { id: { not: input.excludeFighterId } }
          : {}),
      },
      select: {
        id: true,
        fighterCode: true,
        phone: true,
        name: true,
      },
    });

    const nameLower = normalizedName.toLowerCase();
    const byName = rows.filter(
      (r) => r.name.trim().toLowerCase() === nameLower,
    );

    if (targetPhone && targetPhone.length > 0) {
      return byName.filter(
        (r) => normalizePhoneDigits(r.phone) === targetPhone,
      ) as FighterDuplicateCandidate[];
    }
    return byName as FighterDuplicateCandidate[];
  },

  async findFighterById(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GymFighterListRow | null> {
    const row = await db(tx).fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        gender: true,
        weight: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        status: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });
    return row as GymFighterListRow | null;
  },

  /**
   * 생년월일(일 단위) + 성별 + 휴대폰(숫자만 동일) 기준 중복 후보.
   */
  async findPotentialDuplicateFighters(input: {
    birthDate: Date | null;
    gender: string;
    phone: string;
  }): Promise<FighterDuplicateCandidate[]> {
    if (!input.birthDate) return [];
    const dayStart = toUtcDateOnly(input.birthDate);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const targetPhone = normalizePhoneDigits(input.phone);

    const rows = await prisma.fighter.findMany({
      where: {
        gender: input.gender,
        birthDate: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        id: true,
        fighterCode: true,
        phone: true,
        name: true,
      },
    });

    return rows.filter(
      (r) => normalizePhoneDigits(r.phone) === targetPhone,
    ) as FighterDuplicateCandidate[];
  },

  async findFighterForGymApplication(
    fighterId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    id: string;
    fighterCode: string;
    name: string;
    birthDate: Date | null;
    gender: string;
    phone: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    recordTotalBouts: number;
    weight: number | null;
    status: FighterStatus;
    schoolName: string | null;
    grade: string | null;
    schoolLevel: string | null;
    schoolGrade: number | null;
    guardianName: string | null;
    guardianPhone: string | null;
  } | null> {
    const row = await db(tx).fighter.findFirst({
      where: {
        id: fighterId,
        ...activeFighterAffiliatedWithGymWhere(gymId),
      },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        profileImageUrl: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        recordTotalBouts: true,
        weight: true,
        status: true,
        schoolName: true,
        grade: true,
        schoolLevel: true,
        schoolGrade: true,
        guardianName: true,
        guardianPhone: true,
      },
    });
    return row;
  },

  async listActiveFightersForEventApplication(gymId: string): Promise<
    {
      id: string;
      fighterCode: string;
      name: string;
      birthDate: Date | null;
      gender: string;
      weight: number | null;
      primarySport: string | null;
      profileImageUrl: string | null;
      recordWin: number;
      recordLoss: number;
      recordDraw: number;
      status: FighterStatus;
      schoolName: string | null;
      grade: string | null;
      guardianName: string | null;
      guardianPhone: string | null;
    }[]
  > {
    return prisma.fighter.findMany({
      where: activeFighterEligibleForEventApplicationWhere(gymId),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        birthDate: true,
        gender: true,
        weight: true,
        primarySport: true,
        profileImageUrl: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        status: true,
        schoolName: true,
        grade: true,
        guardianName: true,
        guardianPhone: true,
      },
    });
  },

  async createFighterWithGymHistory(
    tx: Prisma.TransactionClient,
    params: {
      fighterCode: string;
      name: string;
      birthDate: Date | null;
      gender: string;
      phone: string;
      height?: number | null;
      weight?: number | null;
      profileImageUrl?: string | null;
      schoolName?: string | null;
      grade?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
      primarySport?: string | null;
      gymInternalMemo?: string | null;
      currentGymId: string;
      gymMemberId?: string | null;
      recordTotalBouts?: number;
      recordWin?: number;
      recordDraw?: number;
      recordLoss?: number;
      recordText?: string | null;
    },
  ): Promise<{ id: string; fighterCode: string }> {
    const fighter = await tx.fighter.create({
      data: {
        fighterCode: params.fighterCode,
        name: params.name,
        birthDate: params.birthDate,
        gender: params.gender,
        phone: params.phone,
        height: params.height,
        weight: params.weight,
        profileImageUrl: params.profileImageUrl,
        schoolName: params.schoolName ?? null,
        grade: params.grade ?? null,
        guardianName: params.guardianName ?? null,
        guardianPhone: params.guardianPhone ?? null,
        primarySport: params.primarySport ?? null,
        currentGymId: params.currentGymId,
        gymMemberId: params.gymMemberId ?? null,
        recordTotalBouts: params.recordTotalBouts ?? 0,
        recordWin: params.recordWin ?? 0,
        recordDraw: params.recordDraw ?? 0,
        recordLoss: params.recordLoss ?? 0,
        recordText: params.recordText ?? null,
      },
      select: { id: true, fighterCode: true },
    });

    const existingHistory = await tx.fighterGymHistory.findFirst({
      where: {
        fighterId: fighter.id,
        gymId: params.currentGymId,
        status: "active",
        endDate: null,
      },
    });
    if (existingHistory) {
      throw new AppError(
        "CONFLICT",
        "이미 이 체육관에 활성 소속으로 등록된 선수입니다.",
      );
    }

    await tx.fighterGymHistory.create({
      data: {
        fighterId: fighter.id,
        gymId: params.currentGymId,
        status: "active",
        gymInternalMemo: params.gymInternalMemo ?? null,
      },
    });

    return fighter;
  },

  async linkExistingFighterToGym(
    tx: Prisma.TransactionClient,
    input: {
      fighterId: string;
      gymId: string;
      gymInternalMemo?: string | null;
    },
  ): Promise<void> {
    const fighter = await tx.fighter.findUnique({
      where: { id: input.fighterId },
      select: { id: true, currentGymId: true },
    });
    if (!fighter) {
      throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    }

    const existing = await tx.fighterGymHistory.findFirst({
      where: {
        fighterId: input.fighterId,
        gymId: input.gymId,
        status: "active",
        endDate: null,
      },
    });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 이 체육관에 활성 소속으로 등록된 선수입니다.",
      );
    }

    await tx.fighterGymHistory.create({
      data: {
        fighterId: input.fighterId,
        gymId: input.gymId,
        status: "active",
        gymInternalMemo: input.gymInternalMemo ?? null,
      },
    });

    await tx.fighter.update({
      where: { id: input.fighterId },
      data: { currentGymId: input.gymId, status: FighterStatus.active },
    });
  },

  async updateFighterProfile(
    tx: Prisma.TransactionClient,
    fighterId: string,
    data: {
      name: string;
      birthDate: Date | null;
      gender: string;
      phone: string;
      height?: number | null;
      weight?: number | null;
      primarySport?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
      status?: FighterStatus;
      recordTotalBouts?: number;
      recordWin?: number;
      recordDraw?: number;
      recordLoss?: number;
      recordText?: string | null;
    },
  ): Promise<void> {
    await tx.fighter.update({
      where: { id: fighterId },
      data: {
        name: data.name,
        birthDate: data.birthDate,
        gender: data.gender,
        phone: data.phone,
        height: data.height,
        weight: data.weight,
        primarySport: data.primarySport ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
        ...(data.status ? { status: data.status } : {}),
        ...(data.recordTotalBouts != null
          ? {
              recordTotalBouts: data.recordTotalBouts,
              recordWin: data.recordWin ?? 0,
              recordDraw: data.recordDraw ?? 0,
              recordLoss: data.recordLoss ?? 0,
              recordText: data.recordText ?? null,
            }
          : {}),
      },
    });
  },

  async updateGymHistoryMemo(
    tx: Prisma.TransactionClient,
    historyId: string,
    gymInternalMemo: string | null,
  ): Promise<void> {
    await tx.fighterGymHistory.update({
      where: { id: historyId },
      data: { gymInternalMemo },
    });
  },

  async endActiveGymAffiliation(
    tx: Prisma.TransactionClient,
    fighterId: string,
    gymId: string,
  ): Promise<void> {
    const history = await tx.fighterGymHistory.findFirst({
      where: {
        fighterId,
        ...activeGymHistoryWhere(gymId),
      },
    });
    if (!history) {
      throw new AppError(
        "NOT_FOUND",
        "이 선수는 현재 체육관 소속이 아닙니다.",
      );
    }

    const now = new Date();
    await tx.fighterGymHistory.update({
      where: { id: history.id },
      data: {
        endDate: now,
        status: "ended",
        isPublicToOrganizers: false,
        publicDisabledAt: now,
      },
    });

    const fighter = await tx.fighter.findUnique({
      where: { id: fighterId },
      select: { currentGymId: true },
    });
    if (fighter?.currentGymId === gymId) {
      await tx.fighter.update({
        where: { id: fighterId },
        data: { currentGymId: null },
      });
    }
  },

  /**
   * 다음 fighterCode — `FTR-YYYY-NNNNNN` 형식만 순번 대상 (데모·비표준 코드 제외).
   */
  async generateNextFighterCodeForYear(
    tx: Prisma.TransactionClient,
    year: number,
  ): Promise<string> {
    const prefix = `FTR-${year}-`;
    const numericPattern = new RegExp(`^FTR-${year}-(\\d{6})$`);

    const rows = await tx.fighter.findMany({
      where: { fighterCode: { startsWith: prefix } },
      select: { fighterCode: true },
    });

    let maxSeq = 0;
    for (const { fighterCode } of rows) {
      const match = numericPattern.exec(fighterCode);
      if (!match) continue;
      const n = parseInt(match[1]!, 10);
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
    }

    const next = maxSeq + 1;
    if (next > 999_999) {
      throw new AppError(
        "CONFLICT",
        "해당 연도 선수 고유번호 한도에 도달했습니다.",
      );
    }

    return `${prefix}${String(next).padStart(6, "0")}`;
  },

  async findFighterWithGymForResultSnapshot(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    currentGymId: string | null;
    gymName: string | null;
  } | null> {
    const row = await db(tx).fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        profileImageUrl: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        currentGymId: true,
        currentGym: { select: { name: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      fighterCode: row.fighterCode,
      name: row.name,
      profileImageUrl: row.profileImageUrl,
      recordWin: row.recordWin,
      recordLoss: row.recordLoss,
      recordDraw: row.recordDraw,
      currentGymId: row.currentGymId,
      gymName: row.currentGym?.name ?? null,
    };
  },

  async updateFighterRecordCache(
    fighterId: string,
    cache: { recordWin: number; recordLoss: number; recordDraw: number },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // recordTotalBouts = MATCHON 내 확정 경기 수 (idempotent 재집계)
    const recordTotalBouts = cache.recordWin + cache.recordLoss + cache.recordDraw;
    await db(tx).fighter.update({
      where: { id: fighterId },
      data: {
        recordWin: cache.recordWin,
        recordLoss: cache.recordLoss,
        recordDraw: cache.recordDraw,
        recordTotalBouts,
      },
    });
  },
};
