/**
 * Runtime verifies: idempotency + negative balance + concurrent debit (yamanote only).
 *
 * Avoids importing `server-only` services — exercises repository lock + ledger rules.
 *
 *   npx tsx scripts/verify-billing-runtime.mts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  BillingLedgerType,
  BillingOwnerType,
  BillingServiceType,
} from "../src/generated/prisma";

function assertYamanote(databaseUrl: string) {
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error("REFUSING: Development yamanote only");
  }
}

function id() {
  return `c${randomBytes(12).toString("hex")}`;
}

async function main() {
  const pg = JSON.parse(
    execSync("railway variable list -e development -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const organizer = await prisma.organizer.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  assert.ok(organizer, "need organizer");

  let account = await prisma.billingAccount.findUnique({
    where: { organizerId: organizer.id },
    include: { wallet: true },
  });
  if (!account?.wallet) {
    account = await prisma.billingAccount.create({
      data: {
        ownerType: BillingOwnerType.organizer,
        organizerId: organizer.id,
        status: "active",
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });
  }
  const walletId = account.wallet!.id;
  const before = account.wallet!.balance;

  async function creditOnce(amount: number, key: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.creditLedger.findUnique({
        where: { idempotencyKey: key },
      });
      if (existing) {
        return { skipped: true as const, ...existing };
      }
      const locked = await tx.$queryRaw<{ id: string; balance: number }[]>`
        SELECT id, balance FROM "CreditWallet" WHERE id = ${walletId} FOR UPDATE
      `;
      const bal = locked[0]!.balance;
      const after = bal + amount;
      await tx.creditWallet.update({
        where: { id: walletId },
        data: { balance: after },
      });
      const row = await tx.creditLedger.create({
        data: {
          walletId,
          type: BillingLedgerType.promotion,
          amount,
          balanceBefore: bal,
          balanceAfter: after,
          serviceType: BillingServiceType.other,
          idempotencyKey: key,
          reason: "verify credit",
        },
      });
      return { skipped: false as const, ...row };
    });
  }

  async function debitOnce(amount: number, key: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.creditLedger.findUnique({
        where: { idempotencyKey: key },
      });
      if (existing) {
        return { skipped: true as const, ...existing };
      }
      const locked = await tx.$queryRaw<{ id: string; balance: number }[]>`
        SELECT id, balance FROM "CreditWallet" WHERE id = ${walletId} FOR UPDATE
      `;
      const bal = locked[0]!.balance;
      const after = bal - amount;
      if (after < 0) {
        throw new Error("INSUFFICIENT");
      }
      await tx.creditWallet.update({
        where: { id: walletId },
        data: { balance: after },
      });
      const row = await tx.creditLedger.create({
        data: {
          walletId,
          type: BillingLedgerType.usage,
          amount: -amount,
          balanceBefore: bal,
          balanceAfter: after,
          serviceType: BillingServiceType.other,
          idempotencyKey: key,
          reason: "verify debit",
        },
      });
      return { skipped: false as const, ...row };
    });
  }

  const key = `verify_idempotency:${organizer.id}:${Date.now()}`;
  const first = await creditOnce(7, key);
  const second = await creditOnce(7, key);
  assert.equal(second.skipped, true);
  assert.equal(second.id, first.id);

  const afterCredit = await prisma.creditWallet.findUniqueOrThrow({
    where: { id: walletId },
  });
  assert.equal(afterCredit.balance, before + 7);

  let blocked = false;
  try {
    await debitOnce(afterCredit.balance + 1, `verify_neg:${id()}`);
  } catch {
    blocked = true;
  }
  assert.equal(blocked, true);

  await debitOnce(7, `verify_cleanup:${id()}`);
  const restored = await prisma.creditWallet.findUniqueOrThrow({
    where: { id: walletId },
  });
  assert.equal(restored.balance, before);

  // concurrent: set balance to exactly 15, two parallel 15-debits → one wins
  await prisma.creditWallet.update({
    where: { id: walletId },
    data: { balance: 15 },
  });
  const stamp = id();
  const results = await Promise.allSettled([
    debitOnce(15, `verify_conc_a:${stamp}`),
    debitOnce(15, `verify_conc_b:${stamp}`),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  const afterConc = await prisma.creditWallet.findUniqueOrThrow({
    where: { id: walletId },
  });
  assert.equal(afterConc.balance, 0);
  assert.ok(afterConc.balance >= 0);

  await prisma.creditWallet.update({
    where: { id: walletId },
    data: { balance: before },
  });

  // Event cutover idempotency key uniqueness
  const appKey = `event_application:verify_cutover_${id()}:approve`;
  await creditOnce(1, appKey);
  const dup = await creditOnce(1, appKey);
  assert.equal(dup.skipped, true);
  await debitOnce(1, `event_application:verify_cutover_cleanup:${id()}`);
  await prisma.creditWallet.update({
    where: { id: walletId },
    data: { balance: before },
  });

  console.log("PASS verify:billing-runtime");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
