import "server-only";

import { randomBytes } from "crypto";
import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  InviteLinkStatus,
  InviteLinkType,
} from "@/lib/enums";
import { inviteLinkRepository } from "@/lib/repositories/invite-link.repository";
import { requireGymOwner, requireRole } from "@/lib/permissions";

export type InviteGateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "inactive" | "expired" | "max_uses" };

export type InviteGateReason = Extract<
  InviteGateResult,
  { ok: false }
>["reason"];

/**
 * 공개 폼·제출 공통 검증 (메시지는 노출 최소화).
 */
export function evaluateInviteGate(
  link: Awaited<ReturnType<typeof inviteLinkRepository.findInviteLinkByToken>>,
): InviteGateResult {
  if (!link) return { ok: false, reason: "not_found" };
  if (link.status !== InviteLinkStatus.active) {
    return { ok: false, reason: "inactive" };
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (link.maxUses != null && link.usedCount >= link.maxUses) {
    return { ok: false, reason: "max_uses" };
  }
  return { ok: true };
}

export async function markInviteExpiredIfNeeded(linkId: string): Promise<void> {
  await inviteLinkRepository.updateInviteLinkStatus(
    linkId,
    InviteLinkStatus.expired,
  );
}

export const inviteLinkService = {
  evaluateInviteGate,

  /** 만료된 활성 링크를 DB 상태만 정리 (비차단). */
  async refreshInviteExpiryStatus(
    link: NonNullable<
      Awaited<ReturnType<typeof inviteLinkRepository.findInviteLinkByToken>>
    >,
  ): Promise<void> {
    if (
      link.status === InviteLinkStatus.active &&
      link.expiresAt &&
      link.expiresAt.getTime() < Date.now()
    ) {
      await markInviteExpiredIfNeeded(link.id);
    }
  },

  async createFighterRegistrationInviteLink(
    actor: ActorContext,
    input: {
      gymId?: string;
      expiresAt: Date | null;
      maxUses: number | null;
    },
  ): Promise<{ token: string; id: string }> {
    requireRole(actor, ["gym", "admin"]);

    const gymId =
      actor.role === "gym" ? actor.gymId ?? undefined : input.gymId;

    if (!gymId) {
      throw new AppError(
        "FORBIDDEN",
        "체육관 컨텍스트가 없습니다. 관장 계정으로 이용해 주세요.",
      );
    }

    await requireGymOwner(actor, gymId);

    const token = randomBytes(24).toString("hex");

    const row = await inviteLinkRepository.createGymInviteLink({
      gymId,
      token,
      type: InviteLinkType.fighter_registration,
      expiresAt: input.expiresAt,
      maxUses: input.maxUses,
      createdByUserId: actor.userId,
    });

    return { token: row.token, id: row.id };
  },

  async listGymInviteLinks(actor: ActorContext) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);
    return inviteLinkRepository.listGymInviteLinks(gymId);
  },

  async validateInviteToken(token: string): Promise<
    | {
        ok: true;
        link: NonNullable<
          Awaited<ReturnType<typeof inviteLinkRepository.findInviteLinkByToken>>
        >;
      }
    | { ok: false; reason: InviteGateReason }
  > {
    const link = await inviteLinkRepository.findInviteLinkByToken(token);
    const gate = evaluateInviteGate(link);
    if (!gate.ok) {
      if (
        link &&
        gate.reason === "expired" &&
        link.status === InviteLinkStatus.active
      ) {
        await markInviteExpiredIfNeeded(link.id);
      }
      return { ok: false, reason: gate.reason };
    }
    return { ok: true, link: link! };
  },

  async assertInviteAcceptsSubmissionInTx(
    token: string,
    tx: Prisma.TransactionClient,
  ): Promise<
    NonNullable<
      Awaited<ReturnType<typeof inviteLinkRepository.findInviteLinkByToken>>
    >
  > {
    const link = await inviteLinkRepository.findInviteLinkByToken(token, tx);
    const gate = evaluateInviteGate(link);
    if (!gate.ok) {
      throw new AppError(
        "NOT_FOUND",
        "유효하지 않거나 만료된 초대 링크입니다.",
      );
    }
    return link!;
  },
};
