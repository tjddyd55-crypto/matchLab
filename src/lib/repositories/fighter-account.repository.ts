/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const fighterAccountRepository = {
  async findUserByLoginId(loginId: string) {
    return prisma.user.findUnique({
      where: { loginId },
      select: {
        id: true,
        email: true,
        authUserId: true,
        role: true,
        loginId: true,
        mustChangePassword: true,
        fighter: { select: { id: true } },
      },
    });
  },

  async isLoginIdTaken(loginId: string, excludeUserId?: string): Promise<boolean> {
    const row = await prisma.user.findUnique({
      where: { loginId },
      select: { id: true },
    });
    if (!row) return false;
    if (excludeUserId && row.id === excludeUserId) return false;
    return true;
  },

  async createFighterUser(
    tx: Prisma.TransactionClient,
    data: {
      authUserId: string;
      email: string;
      loginId: string;
      name: string;
      mustChangePassword: boolean;
      passwordIssuedAt: Date;
    },
  ) {
    return tx.user.create({
      data: {
        authUserId: data.authUserId,
        email: data.email,
        loginId: data.loginId,
        name: data.name,
        role: UserRole.fighter,
        mustChangePassword: data.mustChangePassword,
        passwordIssuedAt: data.passwordIssuedAt,
      },
      select: { id: true },
    });
  },

  async linkFighterUserId(
    tx: Prisma.TransactionClient,
    fighterId: string,
    userId: string,
  ) {
    await tx.fighter.update({
      where: { id: fighterId },
      data: { userId },
    });
  },

  async updatePasswordFlags(
    userId: string,
    data: {
      mustChangePassword: boolean;
      passwordResetAt?: Date;
      passwordIssuedAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    await client.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: data.mustChangePassword,
        passwordResetAt: data.passwordResetAt,
        passwordIssuedAt: data.passwordIssuedAt,
      },
    });
  },

  async findPendingRegistrationByPendingUserId(userId: string) {
    return prisma.fighterRegistrationSubmission.findFirst({
      where: { pendingUserId: userId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        status: true,
        gymId: true,
        name: true,
        gym: { select: { name: true } },
      },
    });
  },

  async setSubmissionPendingUser(
    submissionId: string,
    pendingUserId: string,
    loginId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    await client.fighterRegistrationSubmission.update({
      where: { id: submissionId },
      data: { pendingUserId, loginId },
    });
  },
};
