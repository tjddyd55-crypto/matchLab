/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { JudgeCredentialRole, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type JudgeCredentialRow = {
  id: string;
  eventId: string;
  loginId: string;
  passwordHash: string;
  displayName: string | null;
  role: JudgeCredentialRole;
  verifiedName: string | null;
  birthDate: Date | null;
  phone: string | null;
  organization: string | null;
  identityConfirmedAt: Date | null;
  identityConfirmedIp: string | null;
  identityConfirmedUserAgent: string | null;
  memo: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JudgeCredentialWithAssignmentCount = JudgeCredentialRow & {
  assignmentCount: number;
};

export const judgeCredentialRepository = {
  async listByEvent(eventId: string): Promise<JudgeCredentialRow[]> {
    return db().judgeAccessCredential.findMany({
      where: { eventId },
      orderBy: [{ isActive: "desc" }, { loginId: "asc" }],
    });
  },

  async listByEventWithAssignmentCounts(
    eventId: string,
  ): Promise<JudgeCredentialWithAssignmentCount[]> {
    const rows = await db().judgeAccessCredential.findMany({
      where: { eventId },
      include: {
        _count: { select: { assignments: { where: { isActive: true } } } },
      },
      orderBy: [{ isActive: "desc" }, { loginId: "asc" }],
    });
    return rows.map(({ _count, ...row }) => ({
      ...row,
      assignmentCount: _count.assignments,
    }));
  },

  async findById(id: string): Promise<JudgeCredentialRow | null> {
    return db().judgeAccessCredential.findUnique({ where: { id } });
  },

  async findByLoginId(
    loginId: string,
  ): Promise<JudgeCredentialRow | null> {
    const normalized = loginId.trim().toLowerCase();
    return db().judgeAccessCredential.findFirst({
      where: { loginId: normalized, isActive: true },
    });
  },

  async create(
    data: {
      eventId: string;
      loginId: string;
      passwordHash: string;
      displayName?: string | null;
      role?: JudgeCredentialRole;
      memo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<JudgeCredentialRow> {
    return db(tx).judgeAccessCredential.create({
      data: {
        eventId: data.eventId,
        loginId: data.loginId.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        displayName: data.displayName?.trim() || null,
        role: data.role ?? "SCORING_JUDGE",
        memo: data.memo?.trim() || null,
      },
    });
  },

  async confirmIdentity(
    id: string,
    data: {
      verifiedName: string;
      birthDate: Date;
      phone?: string | null;
      organization?: string | null;
      identityConfirmedIp?: string | null;
      identityConfirmedUserAgent?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<JudgeCredentialRow> {
    return db(tx).judgeAccessCredential.update({
      where: { id },
      data: {
        verifiedName: data.verifiedName,
        birthDate: data.birthDate,
        phone: data.phone?.trim() || null,
        organization: data.organization?.trim() || null,
        identityConfirmedAt: new Date(),
        identityConfirmedIp: data.identityConfirmedIp ?? null,
        identityConfirmedUserAgent: data.identityConfirmedUserAgent ?? null,
      },
    });
  },

  async updatePassword(
    id: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).judgeAccessCredential.update({
      where: { id },
      data: { passwordHash },
    });
  },

  async setActive(
    id: string,
    isActive: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).judgeAccessCredential.update({
      where: { id },
      data: { isActive },
    });
  },

  async touchLogin(id: string): Promise<void> {
    await db().judgeAccessCredential.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },
};
