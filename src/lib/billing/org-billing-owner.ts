import "server-only";

import { randomUUID } from "crypto";
import type { BillingProviderEnvironment, Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";

export type BillingOrgOwner =
  | {
      kind: "gym";
      gymId: string;
      organizerId: null;
      /** Org contract subject owner user (for legacy userId column). */
      ownerUserId: string;
      tossCustomerKey: string | null;
    }
  | {
      kind: "organizer";
      gymId: null;
      organizerId: string;
      ownerUserId: string;
      tossCustomerKey: string | null;
    };

type Tx = Prisma.TransactionClient;

/**
 * Resolve the organization that owns MATCHON subscription for this actor.
 * Gym role → owned Gym; Organizer role → Organizer profile.
 */
export async function resolveBillingOrgOwner(
  actor: Pick<ActorContext, "userId" | "role">,
  tx?: Tx,
): Promise<BillingOrgOwner | null> {
  const db = tx ?? prisma;

  if (actor.role === "gym") {
    const gym = await db.gym.findUnique({
      where: { ownerUserId: actor.userId },
      select: { id: true, ownerUserId: true, tossCustomerKey: true },
    });
    if (!gym) return null;
    return {
      kind: "gym",
      gymId: gym.id,
      organizerId: null,
      ownerUserId: gym.ownerUserId,
      tossCustomerKey: gym.tossCustomerKey,
    };
  }

  if (actor.role === "organizer") {
    const organizer = await db.organizer.findUnique({
      where: { userId: actor.userId },
      select: { id: true, userId: true, tossCustomerKey: true },
    });
    if (!organizer) return null;
    return {
      kind: "organizer",
      gymId: null,
      organizerId: organizer.id,
      ownerUserId: organizer.userId,
      tossCustomerKey: organizer.tossCustomerKey,
    };
  }

  return null;
}

/** Require org owner context for gym/organizer billing mutations. */
export async function requireBillingOrgOwner(
  actor: Pick<ActorContext, "userId" | "role">,
  tx?: Tx,
): Promise<BillingOrgOwner> {
  const org = await resolveBillingOrgOwner(actor, tx);
  if (!org) {
    throw new AppError(
      "FORBIDDEN",
      "조직(체육관/협회) 구독 주체를 찾을 수 없습니다.",
    );
  }
  return org;
}

/**
 * Stable Toss customerKey for organization.
 * Never reuse User.tossCustomerKey for org checkout (env isolation + owner change).
 */
export async function ensureOrgTossCustomerKey(
  org: BillingOrgOwner,
  tx: Tx,
): Promise<string> {
  if (org.tossCustomerKey) return org.tossCustomerKey;
  const key = randomUUID();
  if (org.kind === "gym") {
    await tx.gym.update({
      where: { id: org.gymId },
      data: { tossCustomerKey: key },
    });
  } else {
    await tx.organizer.update({
      where: { id: org.organizerId },
      data: { tossCustomerKey: key },
    });
  }
  return key;
}

/** Prisma connect helpers for org-owned billing rows. */
export function orgOwnerConnect(org: BillingOrgOwner): {
  gym?: { connect: { id: string } };
  organizer?: { connect: { id: string } };
} {
  if (org.kind === "gym") {
    return { gym: { connect: { id: org.gymId } } };
  }
  return { organizer: { connect: { id: org.organizerId } } };
}

export function orgOwnerScalarIds(org: BillingOrgOwner): {
  gymId: string | null;
  organizerId: string | null;
} {
  return {
    gymId: org.kind === "gym" ? org.gymId : null,
    organizerId: org.kind === "organizer" ? org.organizerId : null,
  };
}

/** Soft-delete scope for default payment methods of this org (or legacy user). */
export function paymentMethodDefaultWhere(
  org: BillingOrgOwner | null,
  userId: string,
): Prisma.BillingPaymentMethodWhereInput {
  if (org?.kind === "gym") {
    return { gymId: org.gymId, deletedAt: null, isDefault: true };
  }
  if (org?.kind === "organizer") {
    return { organizerId: org.organizerId, deletedAt: null, isDefault: true };
  }
  return { userId, gymId: null, organizerId: null, deletedAt: null, isDefault: true };
}

export function mapProviderEnvironment(
  isTestKey: boolean,
): BillingProviderEnvironment {
  return isTestKey ? "TEST" : "LIVE";
}

/**
 * Actor may complete a payment if they are the creating user OR
 * authorized payer for the payment's org owner.
 */
export function actorCanAccessPayment(
  actor: Pick<ActorContext, "userId">,
  payment: {
    userId: string;
    actorUserId: string | null;
    gymId: string | null;
    organizerId: string | null;
  },
  org: BillingOrgOwner | null,
): boolean {
  if (payment.userId === actor.userId) return true;
  if (payment.actorUserId === actor.userId) return true;
  if (org?.kind === "gym" && payment.gymId === org.gymId) return true;
  if (org?.kind === "organizer" && payment.organizerId === org.organizerId) {
    return true;
  }
  return false;
}
