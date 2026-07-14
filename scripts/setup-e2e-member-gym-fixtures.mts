/**
 * Stage B 브라우저 E2E용 로컬/Preview 픽스처.
 * production 데이터 수정 금지 — e2e-member-gym-* prefix만 생성.
 *
 *   DATABASE_URL=... npx tsx scripts/setup-e2e-member-gym-fixtures.mts
 *   DATABASE_URL=... npx tsx scripts/setup-e2e-member-gym-fixtures.mts --cleanup
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  AssociationMemberGymStatus,
  FighterStatus,
  OrganizerType,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";

const PREFIX = "e2e-member-gym";
const cleanupOnly = process.argv.includes("--cleanup");

async function cleanup(prisma: PrismaClient) {
  const members = await prisma.associationMemberGym.findMany({
    where: { gym: { name: { startsWith: PREFIX } } },
    select: { id: true, gymId: true },
  });
  const gymIds = members.map((m) => m.gymId);
  const extraGyms = await prisma.gym.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true, ownerUserId: true },
  });
  for (const g of extraGyms) {
    if (!gymIds.includes(g.id)) gymIds.push(g.id);
  }

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { targetType: "AssociationMemberGym", targetId: { in: members.map((m) => m.id) } },
        { afterData: { path: ["via"], equals: "e2e-fixture" } },
      ],
    },
  });

  await prisma.fighterGymHistory.deleteMany({
    where: { gymId: { in: gymIds } },
  });
  await prisma.fighter.deleteMany({
    where: { currentGymId: { in: gymIds } },
  });
  await prisma.associationMemberGym.deleteMany({
    where: { id: { in: members.map((m) => m.id) } },
  });

  const owners = await prisma.gym.findMany({
    where: { id: { in: gymIds } },
    select: { ownerUserId: true },
  });
  await prisma.gym.deleteMany({ where: { id: { in: gymIds } } });

  const ownerIds = owners.map((o) => o.ownerUserId);
  const taggedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { loginId: { startsWith: PREFIX } },
        { loginId: { startsWith: `manual-gym-${PREFIX}` } },
        { email: { startsWith: PREFIX } },
        { email: { contains: `@${PREFIX}` } },
        { name: { startsWith: PREFIX } },
      ],
    },
    select: { id: true },
  });
  const userIds = [...new Set([...ownerIds, ...taggedUsers.map((u) => u.id)])];
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`CLEANUP ok members=${members.length} gyms=${gymIds.length} users=${userIds.length}`);
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("FAIL: DATABASE_URL missing");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    ssl:
      url.includes("localhost") || url.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    if (cleanupOnly) {
      await cleanup(prisma);
      return;
    }

    try {
      await prisma.$queryRawUnsafe(
        `SELECT "ownerAccessSuspendedAt" FROM "AssociationMemberGym" LIMIT 0`,
      );
    } catch {
      console.error(
        "FAIL: Stage B columns missing. Apply additive db push on Preview/local first.",
      );
      process.exit(2);
    }

    await cleanup(prisma);

    const org = await prisma.organizer.findFirst({
      where: { type: OrganizerType.association },
      select: { id: true, userId: true, name: true },
    });
    if (!org) {
      console.error("FAIL: association organizer required");
      process.exit(1);
    }

    const suffix = randomBytes(3).toString("hex");
    const tag = `${PREFIX}-${suffix}`;

    async function makeGym(label: string, status: AssociationMemberGymStatus) {
      const ph = await prisma.user.create({
        data: {
          loginId: `manual-gym-${tag}-${label}`,
          email: `manual-gym-${tag}-${label}@internal.invalid`,
          name: `${tag}-${label}-ph`,
          role: UserRole.gym,
        },
      });
      const gym = await prisma.gym.create({
        data: {
          ownerUserId: ph.id,
          name: `${tag}-${label}`,
          phone: "01088880001",
          address: "e2e-fixture",
        },
      });
      const member = await prisma.associationMemberGym.create({
        data: {
          organizerId: org!.id,
          gymId: gym.id,
          memberCode: `E2E${label.slice(0, 1).toUpperCase()}${suffix}`.slice(0, 12),
          status,
          approvedAt: new Date(),
          suspendedAt:
            status === AssociationMemberGymStatus.suspended
              ? new Date()
              : null,
          withdrawnAt:
            status === AssociationMemberGymStatus.withdrawn
              ? new Date()
              : null,
        },
      });
      return { ph, gym, member };
    }

    const active = await makeGym("active", AssociationMemberGymStatus.active);
    const suspended = await makeGym(
      "suspended",
      AssociationMemberGymStatus.suspended,
    );
    const withdrawn = await makeGym(
      "withdrawn",
      AssociationMemberGymStatus.withdrawn,
    );

    const connectUser = await prisma.user.create({
      data: {
        loginId: `${tag}-connect`,
        email: `${tag}-connect@example.com`,
        name: `${tag}-connect`,
        role: UserRole.gym,
        authUserId: `su-${tag}-connect`,
        phone: "01088880002",
      },
    });

    const realOwner = await prisma.user.create({
      data: {
        loginId: `${tag}-owner`,
        email: `${tag}-owner@example.com`,
        name: `${tag}-owner`,
        role: UserRole.gym,
        authUserId: `su-${tag}-owner`,
        phone: "01088880003",
      },
    });
    await prisma.gym.update({
      where: { id: active.gym.id },
      data: { ownerUserId: realOwner.id },
    });

    const fighter = await prisma.fighter.create({
      data: {
        fighterCode: `E2E${suffix}`.toUpperCase(),
        name: `${tag}-fighter`,
        gender: "male",
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
        phone: "01088880004",
        status: FighterStatus.active,
        currentGymId: active.gym.id,
        gymHistories: {
          create: {
            gymId: active.gym.id,
            status: "active",
            startDate: new Date(),
          },
        },
      },
    });

    console.log(
      JSON.stringify(
        {
          prefix: tag,
          associationOrganizerId: org.id,
          associationOrganizerUserId: org.userId,
          activeMemberGymId: active.member.id,
          activeGymId: active.gym.id,
          activeOwnerUserId: realOwner.id,
          activeOwnerLoginId: realOwner.loginId,
          connectCandidateUserId: connectUser.id,
          placeholderOwnerId: active.ph.id,
          suspendedMemberGymId: suspended.member.id,
          suspendedGymId: suspended.gym.id,
          withdrawnMemberGymId: withdrawn.member.id,
          withdrawnGymId: withdrawn.gym.id,
          fighterId: fighter.id,
          note: "Use --cleanup to remove. Do not run against unintended production.",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
