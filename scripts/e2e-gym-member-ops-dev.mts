/**
 * DEV (yamanote) Gym Member Operations E2E — data-cycle proof.
 * Production write NONE. Avoids importing app modules (ESM interop).
 *
 *   npx tsx scripts/e2e-gym-member-ops-dev.mts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const OUT = join(process.cwd(), "test-results", "gym-member-ops-dev");

function requireYamanote(url: string) {
  const host = new URL(url).hostname;
  if (!host.includes("yamanote") || host.includes("yamabiko")) {
    throw new Error(`ABORT: expected yamanote DEV DB, got ${host}`);
  }
  return host;
}

function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function endAfterMonths(start: Date, months: number): Date {
  const exclusive = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()),
  );
  exclusive.setUTCDate(exclusive.getUTCDate() - 1);
  return exclusive;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const host = requireYamanote(url);

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const report: Record<string, unknown> = {
    host,
    startedAt: new Date().toISOString(),
  };

  try {
    let gym = await prisma.gym.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, ownerUserId: true },
    });
    if (!gym) throw new Error("No active gym on DEV");

    let plan = await prisma.gymMembershipPlan.findFirst({
      where: { gymId: gym.id, deletedAt: null, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!plan) {
      const anyPlan = await prisma.gymMembershipPlan.findFirst({
        where: { deletedAt: null, isActive: true },
      });
      if (anyPlan) {
        gym = await prisma.gym.findUniqueOrThrow({
          where: { id: anyPlan.gymId },
          select: { id: true, name: true, ownerUserId: true },
        });
        plan = anyPlan;
      }
    }

    if (!plan) {
      plan = await prisma.gymMembershipPlan.create({
        data: {
          gymId: gym.id,
          name: `QA_OPS_PLAN_${Date.now().toString(36)}`,
          durationType: "months",
          durationValue: 3,
          price: 150000,
          isActive: true,
        },
      });
      report.planCreated = true;
    }

    const suffix = Date.now().toString(36).slice(-6);
    const digits = `0109${String(Date.now()).slice(-7)}`;
    const memberNumber = `QAOPS${suffix.toUpperCase()}`;

    const member = await prisma.gymMember.create({
      data: {
        gymId: gym.id,
        name: `QA운영_${suffix}`,
        phone: digits,
        normalizedPhone: digits.replace(/\D/g, ""),
        memberNumber,
        status: "active",
        primarySport: "KICKBOXING",
        joinedAt: new Date(),
        createdByUserId: gym.ownerUserId,
      },
    });

    let sportAssignCount = 0;
    const gymSports = await prisma.gymSportTemplateAssignment.findMany({
      where: { gymId: gym.id, isActive: true },
      include: { template: true },
      take: 10,
    });
    let toAssign = gymSports.filter((a) =>
      ["KICKBOXING", "BOXING"].includes(a.template.code),
    );
    if (toAssign.length === 0) toAssign = gymSports.slice(0, 2);
    if (toAssign.length === 0) {
      const global = await prisma.memberSportTemplate.findMany({
        where: {
          active: true,
          code: { in: ["KICKBOXING", "BOXING"] },
        },
        take: 2,
      });
      for (const t of global) {
        try {
          await prisma.gymMemberSportTemplateAssignment.create({
            data: {
              gymMemberId: member.id,
              templateId: t.id,
              isActive: true,
            },
          });
          sportAssignCount += 1;
        } catch {
          // ignore
        }
      }
    } else {
      for (const a of toAssign) {
        try {
          await prisma.gymMemberSportTemplateAssignment.create({
            data: {
              gymMemberId: member.id,
              templateId: a.templateId,
              isActive: true,
            },
          });
          sportAssignCount += 1;
        } catch {
          // ignore
        }
      }
    }

    const startedAt = utcToday();
    const months =
      plan.durationValue && plan.durationValue > 0 ? plan.durationValue : 3;
    const endsAt =
      plan.durationType === "days"
        ? (() => {
            const e = new Date(startedAt);
            e.setUTCDate(e.getUTCDate() + (plan.durationValue ?? 30) - 1);
            return e;
          })()
        : endAfterMonths(startedAt, months);

    const listPrice = plan.price;
    const paidA = 100000;
    const paidB = 50000;

    const sub1 = await prisma.gymMemberSubscription.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        planId: plan.id,
        planNameSnapshot: plan.name,
        priceSnapshot: listPrice,
        startedAt,
        endsAt,
        status: "active",
        creationSource: "sell",
      },
    });

    await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        subscriptionId: sub1.id,
        amount: paidA,
        listPrice,
        discountAmount: 0,
        paymentMethod: "card",
        status: "paid",
        category: "membership",
        paidAt: startedAt,
        createdByUserId: gym.ownerUserId,
        memo: "QA ops payment A",
      },
    });

    await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        subscriptionId: sub1.id,
        amount: paidB,
        discountAmount: 0,
        paymentMethod: "cash",
        status: "paid",
        category: "membership",
        paidAt: startedAt,
        createdByUserId: gym.ownerUserId,
        memo: "QA ops payment B",
      },
    });

    const attendance = await prisma.gymMemberAttendance.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        attendedAt: new Date(),
        attendanceDate: startedAt,
        source: "admin_manual",
        membershipStatusSnapshot: "active",
        createdByUserId: gym.ownerUserId,
      },
    });

    await prisma.gymMemberSubscription.update({
      where: { id: sub1.id },
      data: { status: "ended" },
    });

    const renewStart = new Date(
      Date.UTC(
        endsAt.getUTCFullYear(),
        endsAt.getUTCMonth(),
        endsAt.getUTCDate() + 1,
      ),
    );
    const renewEnds = endAfterMonths(renewStart, months);

    const sub2 = await prisma.gymMemberSubscription.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        planId: plan.id,
        planNameSnapshot: plan.name,
        priceSnapshot: listPrice,
        startedAt: renewStart,
        endsAt: renewEnds,
        status: "active",
        creationSource: "renew",
      },
    });

    await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: member.id,
        subscriptionId: sub2.id,
        amount: listPrice,
        listPrice,
        discountAmount: 0,
        paymentMethod: "transfer",
        status: "paid",
        category: "membership",
        paidAt: startedAt,
        createdByUserId: gym.ownerUserId,
        memo: "QA ops renew",
      },
    });

    const subs = await prisma.gymMemberSubscription.findMany({
      where: { gymMemberId: member.id },
      orderBy: { createdAt: "asc" },
    });
    const payments = await prisma.gymMemberPayment.findMany({
      where: { gymMemberId: member.id },
      orderBy: { createdAt: "asc" },
    });
    const attendances = await prisma.gymMemberAttendance.findMany({
      where: { gymMemberId: member.id, deletedAt: null },
    });

    assert.equal(subs.length, 2);
    assert.equal(subs[0]!.creationSource, "sell");
    assert.equal(subs[0]!.status, "ended");
    assert.equal(subs[1]!.creationSource, "renew");
    assert.equal(subs[1]!.status, "active");
    assert.equal(payments.length, 3);
    assert.equal(attendances.length, 1);
    assert.equal(payments[0]!.amount + payments[1]!.amount, 150000);

    const memberAfter = await prisma.gymMember.findUniqueOrThrow({
      where: { id: member.id },
    });
    assert.equal(memberAfter.name, member.name);
    assert.equal(memberAfter.phone, member.phone);
    assert.equal(memberAfter.primarySport, "KICKBOXING");
    assert.equal(memberAfter.status, "active");

    const todayGross = payments.reduce((s, p) => s + p.amount, 0);
    assert.equal(todayGross, paidA + paidB + listPrice);

    await prisma.gymMember.update({
      where: { id: member.id },
      data: {
        status: "withdrawn",
        memo: `[QA ops ${new Date().toISOString()}]`,
      },
    });

    report.pass = true;
    report.gymId = gym.id;
    report.memberId = member.id;
    report.memberNumber = memberNumber;
    report.sportAssignCount = sportAssignCount;
    report.planId = plan.id;
    report.subscriptionCount = subs.length;
    report.paymentCount = payments.length;
    report.attendanceId = attendance.id;
    report.todayGross = todayGross;
    report.historyPreserved = true;
    report.billingSaasWrite = "NONE";
    report.fighterWrite = "NONE";
    report.eventApplicationWrite = "NONE";
    report.bracketMatchWrite = "NONE";

    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("e2e-gym-member-ops-dev FAIL", e);
  process.exit(1);
});
