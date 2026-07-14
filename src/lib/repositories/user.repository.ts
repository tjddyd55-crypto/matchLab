/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { prisma } from "@/lib/prisma";
import type { OrganizerType, UserRole } from "@/lib/enums";

const actorProfileSelect = {
  id: true,
  email: true,
  role: true,
  loginId: true,
  mustChangePassword: true,
  organizer: { select: { id: true, type: true } },
  ownedGym: { select: { id: true } },
  fighter: { select: { id: true } },
} as const;

export type ActorProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
  loginId: string | null;
  mustChangePassword: boolean;
  organizer: { id: string; type: OrganizerType } | null;
  ownedGym: { id: string } | null;
  fighter: { id: string } | null;
};

export const userRepository = {
  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  },

  /** 모든 역할 — 로그인 아이디(정규화된 소문자) */
  async findUserByLoginId(loginId: string) {
    const id = loginId.trim().toLowerCase();
    if (!id) return null;
    return prisma.user.findFirst({
      where: {
        loginId: { equals: id, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        authUserId: true,
        role: true,
        loginId: true,
        mustChangePassword: true,
      },
    });
  },

  async findUserByAuthUserId(authUserId: string) {
    return prisma.user.findUnique({ where: { authUserId } });
  },

  async findActorProfileByUserId(userId: string): Promise<ActorProfileRow | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: actorProfileSelect,
    });
  },

  async findActorProfileByAuthUserId(
    authUserId: string,
  ): Promise<ActorProfileRow | null> {
    return prisma.user.findUnique({
      where: { authUserId },
      select: actorProfileSelect,
    });
  },

  async getOrganizerIdByUserId(userId: string): Promise<string | null> {
    const o = await prisma.organizer.findUnique({
      where: { userId },
      select: { id: true },
    });
    return o?.id ?? null;
  },

  async getGymIdByOwnerUserId(ownerUserId: string): Promise<string | null> {
    const g = await prisma.gym.findUnique({
      where: { ownerUserId },
      select: { id: true },
    });
    return g?.id ?? null;
  },

  async getFighterIdByUserId(userId: string): Promise<string | null> {
    const f = await prisma.fighter.findUnique({
      where: { userId },
      select: { id: true },
    });
    return f?.id ?? null;
  },
};
