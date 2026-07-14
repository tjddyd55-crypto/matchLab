/**
 * Stage B: gym owner connect / disconnect / invite service integration.
 * Uses e2e-member-gym-* prefix and always cleans up.
 *
 *   DATABASE_URL=... npm run verify:gym-owner-account-service
 *
 * Skips (exit 0) when DATABASE_URL is missing.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  AssociationMemberGymStatus,
  AuditAction,
  OrganizerType,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";
import type { ActorContext } from "../src/lib/auth/actor-context";
import { AppError } from "../src/lib/errors/app-error";
import {
  hashMemberGymOwnerInviteToken,
  MEMBER_GYM_OWNER_INVITE_TTL_MS,
} from "../src/lib/member-gym/owner-account";
import { gymOwnerAccountService } from "../src/lib/services/gym-owner-account.service";

const PREFIX = "e2e-member-gym";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log("verify:gym-owner-account-service: SKIP (no DATABASE_URL)");
    return;
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const tag = `${PREFIX}-${randomBytes(3).toString("hex")}`;

  const createdUserIds: string[] = [];
  const createdGymIds: string[] = [];
  const createdMemberGymIds: string[] = [];

  try {
    try {
      await prisma.$queryRawUnsafe(
        `SELECT "ownerAccessSuspendedAt", "ownerInviteTokenHash" FROM "AssociationMemberGym" LIMIT 0`,
      );
    } catch {
      console.log(
        "verify:gym-owner-account-service: SKIP (Stage B columns not applied — db push 후 Preview/로컬에서 재실행)",
      );
      return;
    }

    const org = await prisma.organizer.findFirst({
      where: { type: OrganizerType.association },
      select: { id: true, userId: true },
    });
    if (!org) {
      console.log(
        "verify:gym-owner-account-service: SKIP (no association organizer)",
      );
      return;
    }
    const organizerActor: ActorContext = {
      userId: org.userId,
      role: "organizer",
      organizerId: org.id,
      organizerType: "association",
    };

    const placeholder = await prisma.user.create({
      data: {
        loginId: `manual-gym-${tag}`,
        email: `manual-gym-${tag}@internal.invalid`,
        name: `${tag}-placeholder`,
        role: UserRole.gym,
      },
    });
    createdUserIds.push(placeholder.id);

    const gym = await prisma.gym.create({
      data: {
        ownerUserId: placeholder.id,
        name: `${tag}-gym`,
        phone: "01099990001",
        address: "e2e-fixture",
      },
    });
    createdGymIds.push(gym.id);

    const member = await prisma.associationMemberGym.create({
      data: {
        organizerId: org.id,
        gymId: gym.id,
        memberCode: `E2E${tag.slice(-6).toUpperCase()}`,
        status: AssociationMemberGymStatus.active,
        approvedAt: new Date(),
      },
    });
    createdMemberGymIds.push(member.id);

    const realOwner = await prisma.user.create({
      data: {
        loginId: `${tag}-owner`,
        email: `${tag}-owner@example.com`,
        name: `${tag}-owner`,
        role: UserRole.gym,
        authUserId: `su-${tag}-owner`,
        phone: "01099990002",
      },
    });
    createdUserIds.push(realOwner.id);

    const otherGymOwner = await prisma.user.create({
      data: {
        loginId: `${tag}-other`,
        email: `${tag}-other@example.com`,
        name: `${tag}-other`,
        role: UserRole.gym,
        authUserId: `su-${tag}-other`,
      },
    });
    createdUserIds.push(otherGymOwner.id);
    const otherGym = await prisma.gym.create({
      data: {
        ownerUserId: otherGymOwner.id,
        name: `${tag}-other-gym`,
      },
    });
    createdGymIds.push(otherGym.id);

    // other gym owner blocked
    await assert.rejects(
      () =>
        gymOwnerAccountService.connectExistingOwner(organizerActor, {
          memberGymId: member.id,
          targetUserId: otherGymOwner.id,
        }),
      (e: unknown) => e instanceof AppError && e.code === "CONFLICT",
    );

    // admin blocked
    const admin = await prisma.user.create({
      data: {
        loginId: `${tag}-admin`,
        email: `${tag}-admin@example.com`,
        name: `${tag}-admin`,
        role: UserRole.admin,
        authUserId: `su-${tag}-admin`,
      },
    });
    createdUserIds.push(admin.id);
    await assert.rejects(
      () =>
        gymOwnerAccountService.connectExistingOwner(organizerActor, {
          memberGymId: member.id,
          targetUserId: admin.id,
        }),
      (e: unknown) => e instanceof AppError && e.code === "FORBIDDEN",
    );

    // connect real owner
    const connected = await gymOwnerAccountService.connectExistingOwner(
      organizerActor,
      { memberGymId: member.id, targetUserId: realOwner.id },
    );
    assert.equal(connected.userId, realOwner.id);
    assert.equal(connected.idempotent, false);

    const gymAfter = await prisma.gym.findUniqueOrThrow({
      where: { id: gym.id },
    });
    assert.equal(gymAfter.ownerUserId, realOwner.id);
    const roleAfter = await prisma.user.findUniqueOrThrow({
      where: { id: realOwner.id },
    });
    assert.equal(roleAfter.role, UserRole.gym);

    // placeholder not hard-deleted
    const placeholderStill = await prisma.user.findUnique({
      where: { id: placeholder.id },
    });
    assert.ok(placeholderStill);

    // idempotent reconnect
    const again = await gymOwnerAccountService.connectExistingOwner(
      organizerActor,
      { memberGymId: member.id, targetUserId: realOwner.id },
    );
    assert.equal(again.idempotent, true);

    // invite: hash only
    const invite = await gymOwnerAccountService.createOwnerInvite(
      organizerActor,
      {
        memberGymId: member.id,
        name: `${tag}-invitee`,
        email: `${tag}-invite@example.com`,
        phone: "01099990003",
      },
    );
    assert.match(invite.inviteUrl, /\/gym-owner-invite\//);
    const token = invite.inviteUrl.split("/").pop()!;
    const memberInvited = await prisma.associationMemberGym.findUniqueOrThrow({
      where: { id: member.id },
    });
    assert.ok(memberInvited.ownerInviteTokenHash);
    assert.equal(
      memberInvited.ownerInviteTokenHash,
      hashMemberGymOwnerInviteToken(token),
    );
    assert.notEqual(memberInvited.ownerInviteTokenHash, token);
    assert.ok(memberInvited.ownerInviteExpiresAt);
    const ttl =
      memberInvited.ownerInviteExpiresAt!.getTime() - Date.now();
    assert.ok(ttl > MEMBER_GYM_OWNER_INVITE_TTL_MS - 60_000);
    assert.ok(ttl <= MEMBER_GYM_OWNER_INVITE_TTL_MS + 5_000);

    await gymOwnerAccountService.cancelOwnerInvite(organizerActor, member.id);

    // disconnect → new placeholder
    await gymOwnerAccountService.disconnectOwnerToPlaceholder(
      organizerActor,
      member.id,
    );
    const gymDisc = await prisma.gym.findUniqueOrThrow({
      where: { id: gym.id },
      include: { ownerUser: true },
    });
    assert.notEqual(gymDisc.ownerUserId, realOwner.id);
    createdUserIds.push(gymDisc.ownerUserId);
    assert.match(gymDisc.ownerUser.email ?? "", /@internal\.invalid$/);
    assert.equal(gymDisc.ownerUser.role, UserRole.gym);
    assert.equal(gymDisc.ownerUser.authUserId, null);

    const previousStill = await prisma.user.findUnique({
      where: { id: realOwner.id },
      include: { ownedGym: true },
    });
    assert.ok(previousStill);
    assert.equal(previousStill!.ownedGym, null);

    const audits = await prisma.auditLog.findMany({
      where: {
        targetType: "AssociationMemberGym",
        targetId: member.id,
        action: {
          in: [
            AuditAction.gym_owner_connected,
            AuditAction.gym_owner_replaced,
            AuditAction.gym_owner_invited,
            AuditAction.gym_owner_invite_cancelled,
          ],
        },
      },
    });
    assert.ok(audits.length >= 3);
    for (const a of audits) {
      const dump = JSON.stringify(a);
      assert.doesNotMatch(dump, new RegExp(token));
    }

    console.log("verify:gym-owner-account-service: ALL_PASS");
  } finally {
    for (const id of createdMemberGymIds) {
      await prisma.associationMemberGym
        .delete({ where: { id } })
        .catch(() => undefined);
    }
    for (const id of createdGymIds) {
      await prisma.gym.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of [...new Set(createdUserIds)]) {
      await prisma.auditLog
        .deleteMany({ where: { actorUserId: id } })
        .catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    // also remove audits for organizer targeting our member gyms
    if (createdMemberGymIds.length) {
      await prisma.auditLog
        .deleteMany({
          where: {
            targetType: "AssociationMemberGym",
            targetId: { in: createdMemberGymIds },
          },
        })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
