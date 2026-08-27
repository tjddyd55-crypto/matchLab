/**
 * Billing Foundation Phase A — Organizer/Gym BillingAccount backfill.
 *
 * Development (yamanote) only.
 *
 *   npx tsx scripts/backfill-billing-accounts.ts --dry-run
 *   npx tsx scripts/backfill-billing-accounts.ts --apply
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  BillingLedgerType,
  BillingOwnerType,
  BillingReferenceType,
  BillingServiceType,
  CreditLedgerType,
  type Prisma,
} from "../src/generated/prisma";

function createId(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

type Summary = {
  dryRun: boolean;
  dbHost: string;
  organizers: number;
  organizerWalletsExisting: number;
  legacyLedgers: number;
  payments: number;
  gyms: number;
  createdOrganizerAccounts: number;
  createdGymAccounts: number;
  createdWallets: number;
  migratedLedgers: number;
  skippedLedgers: number;
  balanceMismatches: Array<{
    organizerId: string;
    legacy: number;
    next: number;
  }>;
  ledgerCountMismatches: Array<{
    organizerId: string;
    legacy: number;
    next: number;
  }>;
};

function assertYamanote(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(
      `REFUSING backfill: expected yamanote Development DB, got ${host || "unknown"}`,
    );
  }
  return host;
}

function mapLegacyType(type: CreditLedgerType): {
  type: BillingLedgerType;
  serviceType: BillingServiceType;
  referenceType: BillingReferenceType | null;
} {
  switch (type) {
    case CreditLedgerType.payment_charge:
      return {
        type: BillingLedgerType.payment_charge,
        serviceType: BillingServiceType.admin,
        referenceType: BillingReferenceType.organizer_credit_payment,
      };
    case CreditLedgerType.manual_charge:
      return {
        type: BillingLedgerType.manual_charge,
        serviceType: BillingServiceType.admin,
        referenceType: BillingReferenceType.admin_manual,
      };
    case CreditLedgerType.debit_participant:
      return {
        type: BillingLedgerType.usage,
        serviceType: BillingServiceType.event,
        referenceType: BillingReferenceType.event_application,
      };
    case CreditLedgerType.refund_participant:
      return {
        type: BillingLedgerType.refund,
        serviceType: BillingServiceType.event,
        referenceType: BillingReferenceType.event_application,
      };
    case CreditLedgerType.adjustment:
      return {
        type: BillingLedgerType.adjustment,
        serviceType: BillingServiceType.admin,
        referenceType: BillingReferenceType.other,
      };
    default:
      return {
        type: BillingLedgerType.adjustment,
        serviceType: BillingServiceType.other,
        referenceType: BillingReferenceType.legacy_organizer_ledger,
      };
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  const pg = JSON.parse(
    execSync("railway variable list -e development -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  const dbHost = assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const summary: Summary = {
    dryRun,
    dbHost,
    organizers: 0,
    organizerWalletsExisting: 0,
    legacyLedgers: 0,
    payments: 0,
    gyms: 0,
    createdOrganizerAccounts: 0,
    createdGymAccounts: 0,
    createdWallets: 0,
    migratedLedgers: 0,
    skippedLedgers: 0,
    balanceMismatches: [],
    ledgerCountMismatches: [],
  };

  try {
    const organizers = await prisma.organizer.findMany({
      select: { id: true, creditWallet: true },
      orderBy: { id: "asc" },
    });
    const gyms = await prisma.gym.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    summary.organizers = organizers.length;
    summary.organizerWalletsExisting = organizers.filter(
      (o) => o.creditWallet,
    ).length;
    summary.legacyLedgers = await prisma.organizerCreditLedger.count();
    summary.payments = await prisma.organizerCreditPayment.count();
    summary.gyms = gyms.length;

    const existingOrgAccounts = await prisma.billingAccount.findMany({
      where: { ownerType: BillingOwnerType.organizer },
      include: { wallet: true },
    });
    const orgAccountByOrganizer = new Map(
      existingOrgAccounts
        .filter((a) => a.organizerId)
        .map((a) => [a.organizerId!, a]),
    );

    const existingGymAccounts = await prisma.billingAccount.findMany({
      where: { ownerType: BillingOwnerType.gym },
      include: { wallet: true },
    });
    const gymAccountByGym = new Map(
      existingGymAccounts
        .filter((a) => a.gymId)
        .map((a) => [a.gymId!, a]),
    );

    const existingLegacyIds = new Set(
      (
        await prisma.creditLedger.findMany({
          where: { legacyLedgerId: { not: null } },
          select: { legacyLedgerId: true },
        })
      )
        .map((r) => r.legacyLedgerId)
        .filter((id): id is string => Boolean(id)),
    );

    const orgCreates: Prisma.BillingAccountCreateManyInput[] = [];
    const walletCreates: Prisma.CreditWalletCreateManyInput[] = [];
    const walletIdByOrganizer = new Map<string, string>();

    for (const org of organizers) {
      const legacyBalance = org.creditWallet?.balance ?? 0;
      const existing = orgAccountByOrganizer.get(org.id);
      if (existing?.wallet) {
        walletIdByOrganizer.set(org.id, existing.wallet.id);
        continue;
      }
      summary.createdOrganizerAccounts += 1;
      summary.createdWallets += 1;
      if (dryRun) continue;

      const accountId = createId();
      const walletId = createId();
      orgCreates.push({
        id: accountId,
        ownerType: BillingOwnerType.organizer,
        organizerId: org.id,
        status: "active",
        updatedAt: new Date(),
      });
      walletCreates.push({
        id: walletId,
        billingAccountId: accountId,
        balance: legacyBalance,
        updatedAt: new Date(),
      });
      walletIdByOrganizer.set(org.id, walletId);
    }

    const gymCreates: Prisma.BillingAccountCreateManyInput[] = [];
    for (const gym of gyms) {
      const existing = gymAccountByGym.get(gym.id);
      if (existing?.wallet) continue;
      summary.createdGymAccounts += 1;
      summary.createdWallets += 1;
      if (dryRun) continue;
      const accountId = createId();
      const walletId = createId();
      gymCreates.push({
        id: accountId,
        ownerType: BillingOwnerType.gym,
        gymId: gym.id,
        status: "active",
        updatedAt: new Date(),
      });
      walletCreates.push({
        id: walletId,
        billingAccountId: accountId,
        balance: 0,
        updatedAt: new Date(),
      });
    }

    if (!dryRun) {
      if (orgCreates.length) {
        await prisma.billingAccount.createMany({ data: orgCreates });
      }
      if (gymCreates.length) {
        await prisma.billingAccount.createMany({ data: gymCreates });
      }
      if (walletCreates.length) {
        await prisma.creditWallet.createMany({ data: walletCreates });
      }
    }

    const allLegacy = await prisma.organizerCreditLedger.findMany({
      orderBy: [{ organizerId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });

    const ledgerCreates: Prisma.CreditLedgerCreateManyInput[] = [];
    const byOrganizer = new Map<string, typeof allLegacy>();
    for (const row of allLegacy) {
      const list = byOrganizer.get(row.organizerId) ?? [];
      list.push(row);
      byOrganizer.set(row.organizerId, list);
    }

    for (const org of organizers) {
      const walletId = walletIdByOrganizer.get(org.id);
      const rows = byOrganizer.get(org.id) ?? [];
      let running = 0;
      for (const row of rows) {
        if (existingLegacyIds.has(row.id)) {
          summary.skippedLedgers += 1;
          running = row.balanceAfter;
          continue;
        }
        const mapped = mapLegacyType(row.type);
        const balanceBefore = running;
        const balanceAfter = row.balanceAfter;
        running = balanceAfter;
        summary.migratedLedgers += 1;
        if (dryRun || !walletId) continue;

        ledgerCreates.push({
          id: createId(),
          walletId,
          type: mapped.type,
          amount: row.amount,
          balanceBefore,
          balanceAfter,
          serviceType: mapped.serviceType,
          referenceType:
            row.eventApplicationId != null
              ? BillingReferenceType.event_application
              : row.paymentId != null
                ? BillingReferenceType.organizer_credit_payment
                : mapped.referenceType,
          referenceId: row.eventApplicationId ?? row.paymentId ?? row.id,
          idempotencyKey: `legacy_organizer_ledger:${row.id}`,
          actorUserId: row.createdByUserId,
          reason: row.reason,
          metadata: {
            legacyType: row.type,
            memo: row.memo,
            eventId: row.eventId,
            eventApplicationId: row.eventApplicationId,
            paymentId: row.paymentId,
            paymentRef: row.paymentRef,
            createdByUserId: row.createdByUserId,
          },
          legacyLedgerId: row.id,
          createdAt: row.createdAt,
        });
      }
    }

    if (!dryRun && ledgerCreates.length) {
      const CHUNK = 200;
      for (let i = 0; i < ledgerCreates.length; i += CHUNK) {
        await prisma.creditLedger.createMany({
          data: ledgerCreates.slice(i, i + CHUNK),
          skipDuplicates: true,
        });
      }
    }

    if (!dryRun) {
      for (const org of organizers) {
        const legacyBalance = org.creditWallet?.balance ?? 0;
        const account = await prisma.billingAccount.findUnique({
          where: { organizerId: org.id },
          include: { wallet: true },
        });
        if (!account?.wallet) {
          summary.balanceMismatches.push({
            organizerId: org.id,
            legacy: legacyBalance,
            next: -1,
          });
          continue;
        }
        if (account.wallet.balance !== legacyBalance) {
          await prisma.creditWallet.update({
            where: { id: account.wallet.id },
            data: { balance: legacyBalance },
          });
        }
        const refreshed = await prisma.creditWallet.findUnique({
          where: { id: account.wallet.id },
        });
        if (!refreshed || refreshed.balance !== legacyBalance) {
          summary.balanceMismatches.push({
            organizerId: org.id,
            legacy: legacyBalance,
            next: refreshed?.balance ?? -1,
          });
        }
        const legacyCount = await prisma.organizerCreditLedger.count({
          where: { organizerId: org.id },
        });
        const nextCount = await prisma.creditLedger.count({
          where: { walletId: account.wallet.id },
        });
        if (legacyCount !== nextCount) {
          summary.ledgerCountMismatches.push({
            organizerId: org.id,
            legacy: legacyCount,
            next: nextCount,
          });
        }
      }
    }

    console.log(JSON.stringify(summary, null, 2));
    if (
      summary.balanceMismatches.length ||
      summary.ledgerCountMismatches.length
    ) {
      console.error("FAIL backfill verification mismatches");
      process.exitCode = 1;
    } else {
      console.log(dryRun ? "PASS dry-run (no writes)" : "PASS backfill apply + verify");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
