import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { OrganizerType } from "@/lib/enums";
import { isInternalSyntheticEmail } from "@/lib/auth/synthetic-email";
import { prisma } from "@/lib/prisma";

export type DashboardHeaderIdentity = {
  primaryLabel: string;
  secondaryLabel: string;
};

/**
 * Dashboard header 2줄째 — 로그인 ID SSOT.
 * synthetic email local-part split은 loginId 필드가 없을 때만 resolver 내부 fallback.
 */
export function resolveDashboardLoginId(actor: ActorContext): string {
  const loginId = actor.loginId?.trim();
  if (loginId) return loginId;

  const email = actor.email?.trim();
  if (email && isInternalSyntheticEmail(email)) {
    const local = email.split("@")[0]?.trim();
    if (local && !local.startsWith("manual-gym-")) {
      return local;
    }
  }

  if (email && !isInternalSyntheticEmail(email)) {
    return email;
  }

  return "—";
}

function organizerFallbackTitle(type: OrganizerType | undefined): string {
  return type === OrganizerType.association
    ? "협회 대시보드"
    : "주최자 대시보드";
}

export async function resolveDashboardHeaderIdentity(
  actor: ActorContext,
): Promise<DashboardHeaderIdentity> {
  const secondaryLabel = resolveDashboardLoginId(actor);

  if (actor.role === "admin") {
    return {
      primaryLabel: "MATCHON 관리자",
      secondaryLabel,
    };
  }

  if (actor.role === "gym" || actor.role === "gym_staff") {
    if (actor.gymId) {
      const gym = await prisma.gym.findUnique({
        where: { id: actor.gymId },
        select: { name: true },
      });
      const name = gym?.name?.trim();
      if (name) {
        return { primaryLabel: name, secondaryLabel };
      }
    }
    return { primaryLabel: "체육관 대시보드", secondaryLabel };
  }

  if (actor.role === "organizer" && actor.organizerId) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: actor.organizerId },
      select: { name: true, type: true },
    });
    const name = organizer?.name?.trim();
    if (name) {
      return { primaryLabel: name, secondaryLabel };
    }
    return {
      primaryLabel: organizerFallbackTitle(organizer?.type),
      secondaryLabel,
    };
  }

  if (actor.role === "fighter" && actor.fighterId) {
    const fighter = await prisma.fighter.findUnique({
      where: { id: actor.fighterId },
      select: { name: true },
    });
    const name = fighter?.name?.trim();
    if (name) {
      return { primaryLabel: name, secondaryLabel };
    }
    return { primaryLabel: "선수 대시보드", secondaryLabel };
  }

  switch (actor.role) {
    case "organizer":
      return {
        primaryLabel: organizerFallbackTitle(actor.organizerType),
        secondaryLabel,
      };
    case "fighter":
      return { primaryLabel: "선수 대시보드", secondaryLabel };
    default:
      return { primaryLabel: "대시보드", secondaryLabel };
  }
}
