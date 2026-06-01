/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { FighterStatus, type Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  activeFighterAffiliatedWithGymWhere,
  fighterAffiliatedWithGymWhere,
} from "@/lib/gym-affiliation";
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
  weight: number | null;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
  status: FighterStatus;
  profileImageUrl: string | null;
  createdAt: Date;
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
  } | null> {
    return prisma.fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        currentGymId: true,
        userId: true,
      },
    });
  },

  async listFightersByGym(gymId: string): Promise<GymFighterListRow[]> {
    const rows = await prisma.fighter.findMany({
      where: fighterAffiliatedWithGymWhere(gymId),
      orderBy: { createdAt: "desc" },
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
    return rows as GymFighterListRow[];
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
    birthDate: Date;
    gender: string;
    phone: string;
  }): Promise<FighterDuplicateCandidate[]> {
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
    birthDate: Date;
    gender: string;
    phone: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    weight: number | null;
    status: FighterStatus;
    schoolName: string | null;
    grade: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
  } | null> {
    const row = await db(tx).fighter.findFirst({
      where: { id: fighterId, currentGymId: gymId },
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
        weight: true,
        status: true,
        schoolName: true,
        grade: true,
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
      birthDate: Date;
      gender: string;
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
      where: activeFighterAffiliatedWithGymWhere(gymId),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        birthDate: true,
        gender: true,
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
      birthDate: Date;
      gender: string;
      phone: string;
      height?: number | null;
      weight?: number | null;
      profileImageUrl?: string | null;
      schoolName?: string | null;
      grade?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
      currentGymId: string;
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
        currentGymId: params.currentGymId,
      },
      select: { id: true, fighterCode: true },
    });

    await tx.fighterGymHistory.create({
      data: {
        fighterId: fighter.id,
        gymId: params.currentGymId,
        status: "active",
      },
    });

    return fighter;
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
    await db(tx).fighter.update({
      where: { id: fighterId },
      data: {
        recordWin: cache.recordWin,
        recordLoss: cache.recordLoss,
        recordDraw: cache.recordDraw,
      },
    });
  },
};
