/**
 * Concurrent approve race: only one MemberGym for organizer+gymId.
 * Usage: DATABASE_URL=... npx tsx scripts/verify-member-gym-concurrent-approval.ts
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  AssociationMemberGymApplicationStatus,
  OrganizerType,
  PrismaClient,
} from "../src/generated/prisma/client";
import { memberGymService } from "../src/lib/services/member-gym.service";
import type { ActorContext } from "../src/lib/auth/actor-context";
import { AppError } from "../src/lib/errors/app-error";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("FAIL: DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const tag = `preview-concurrent-${randomBytes(3).toString("hex")}`;

  try {
    const org = await prisma.organizer.findFirst({
      where: { type: OrganizerType.association },
      select: { id: true, userId: true },
    });
    if (!org) throw new Error("no association organizer");

    const gym = await prisma.gym.findFirst({ orderBy: { createdAt: "asc" } });
    if (!gym) throw new Error("no gym");

    const existing = await prisma.associationMemberGym.findUnique({
      where: { organizerId_gymId: { organizerId: org.id, gymId: gym.id } },
    });
    let gymId = gym.id;
    if (existing) {
      const suffix = randomBytes(4).toString("hex");
      const owner = await prisma.user.create({
        data: {
          loginId: `pc-${suffix}`,
          email: `pc-${suffix}@internal.invalid`,
          name: tag,
          role: "gym",
        },
      });
      const g = await prisma.gym.create({
        data: {
          ownerUserId: owner.id,
          name: tag,
          phone: "01000000000",
          address: "concurrent-test",
        },
      });
      gymId = g.id;
    }

    const actor: ActorContext = {
      userId: org.userId,
      role: "organizer",
      organizerId: org.id,
      organizerType: "association",
    };

    const mkApp = async (n: number) =>
      prisma.associationMemberGymApplication.create({
        data: {
          organizerId: org.id,
          status: AssociationMemberGymApplicationStatus.under_review,
          gymName: `${tag}-app-${n}`,
          ownerName: "동시승인",
          phone: `0101111${String(n).padStart(4, "0")}`,
          email: `${tag}-${n}@example.com`,
          gymAddress: "동시승인주소",
          privacyConsent: true,
          registrationConsent: true,
          signatureName: "동시승인",
          signatureConsent: true,
        },
      });

    const a1 = await mkApp(1);
    const a2 = await mkApp(2);
    const gymBefore = await prisma.gym.count();

    const results = await Promise.allSettled([
      memberGymService.approveApplication(actor, {
        applicationId: a1.id,
        mode: "link_existing",
        gymId,
        note: `${tag} A`,
      }),
      memberGymService.approveApplication(actor, {
        applicationId: a2.id,
        mode: "link_existing",
        gymId,
        note: `${tag} B`,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    console.log(`FULFILLED=${fulfilled.length}`);
    console.log(`REJECTED=${rejected.length}`);

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      console.error("FAIL: expected 1 success and 1 rejection");
      process.exit(2);
    }

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    if (!(reason instanceof AppError) || reason.code !== "CONFLICT") {
      console.error(
        "FAIL: expected AppError CONFLICT, got",
        reason instanceof Error ? reason.message : typeof reason,
      );
      process.exit(2);
    }
    if (/P2002|Unique constraint|prisma/i.test(reason.message)) {
      console.error("FAIL: raw prisma unique message leaked");
      process.exit(2);
    }
    console.log("PASS conflict domain error");

    const members = await prisma.associationMemberGym.count({
      where: { organizerId: org.id, gymId },
    });
    if (members !== 1) {
      console.error(`FAIL: member count ${members}`);
      process.exit(2);
    }
    console.log("PASS single MemberGym");

    const gymAfter = await prisma.gym.count();
    if (gymAfter !== gymBefore) {
      console.error(`FAIL: Gym count changed ${gymBefore}->${gymAfter}`);
      process.exit(2);
    }
    console.log("PASS Gym count unchanged");

    await prisma.associationMemberGymApplicationReview.deleteMany({
      where: { application: { email: { startsWith: tag } } },
    });
    await prisma.associationMemberGym.deleteMany({
      where: { organizerId: org.id, gymId },
    });
    await prisma.associationMemberGymApplication.deleteMany({
      where: { email: { startsWith: tag } },
    });
    if (gymId !== gym.id) {
      const g = await prisma.gym.findUnique({ where: { id: gymId } });
      if (g) {
        await prisma.gym.delete({ where: { id: g.id } });
        await prisma.user
          .delete({ where: { id: g.ownerUserId } })
          .catch(() => undefined);
      }
    }
    console.log("CLEANUP=OK");
    console.log("CONCURRENT_APPROVAL=ALL_PASS");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
