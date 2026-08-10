/**
 * QA gym 격리 Excel Import E2E (yamanote only).
 * Preview → Import 49 → second Import skip → renewal count.
 *
 *   npx tsx scripts/e2e-gym-member-excel-import-qa.mts
 *   npx tsx scripts/e2e-gym-member-excel-import-qa.mts --cleanup
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import Module from "node:module";

// Next.js `server-only` shim for Node scripts
const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]!]) continue;
    let v = m[2]!.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]!] = v;
  }
}

loadEnvLocal();

const url = process.env.DATABASE_URL?.trim() ?? "";
if (!/yamanote/i.test(url) || /yamabiko/i.test(url)) {
  console.error("FAIL: yamanote DATABASE_URL required");
  process.exit(1);
}

const PREFIX = "qa-member-import-v4";
const cleanupOnly = process.argv.includes("--cleanup");
const excelPath = join(process.cwd(), "dev", "2026_8_10더원체육관회원.xlsx");

async function main() {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, UserRole, GymStatus } = await import(
    "../src/generated/prisma/client"
  );
  const { parseMemberImportWorkbook } = await import(
    "../src/lib/gym-member-import/excel-parser"
  );
  const { gymMemberImportService } = await import(
    "../src/lib/services/gym-member-import.service"
  );
  const { gymMembershipSaleService } = await import(
    "../src/lib/services/gym-membership-sale.service"
  );
  const {
    GymMemberSubscriptionCreationSource,
    GymMemberPaymentMethod,
  } = await import("../src/lib/enums");

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanup() {
    const gyms = await prisma.gym.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true, ownerUserId: true },
    });
    const gymIds = gyms.map((g) => g.id);
    if (gymIds.length) {
      await prisma.gymMemberPayment.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberSubscription.deleteMany({
        where: { gymId: { in: gymIds } },
      });
      await prisma.gymMemberGroupAssignment.deleteMany({
        where: { gymId: { in: gymIds } },
      });
      await prisma.gymMemberGroup.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMembershipPlan.deleteMany({
        where: { gymId: { in: gymIds } },
      });
      await prisma.gymMemberImportBatch.deleteMany({
        where: { gymId: { in: gymIds } },
      });
      await prisma.gymMember.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gym.deleteMany({ where: { id: { in: gymIds } } });
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { loginId: { startsWith: PREFIX } },
          { email: { startsWith: PREFIX } },
          { id: { in: gyms.map((g) => g.ownerUserId) } },
        ],
      },
      select: { id: true },
    });
    if (users.length) {
      await prisma.user.deleteMany({
        where: { id: { in: users.map((u) => u.id) } },
      });
    }
    console.log(`CLEANUP gyms=${gymIds.length} users=${users.length}`);
  }

  try {
    await cleanup();
    if (cleanupOnly) return;

    const stamp = Date.now().toString(36);
    const user = await prisma.user.create({
      data: {
        loginId: `${PREFIX}-${stamp}`,
        email: `${PREFIX}-${stamp}@internal.invalid`,
        name: `${PREFIX} owner`,
        role: UserRole.gym,
      },
    });
    const gym = await prisma.gym.create({
      data: {
        name: `${PREFIX} ${stamp}`,
        ownerUserId: user.id,
        status: GymStatus.active,
      },
    });

    const actor = {
      userId: user.id,
      role: UserRole.gym,
      email: user.email!,
      loginId: user.loginId ?? undefined,
      gymId: gym.id,
    };

    const buffer = readFileSync(excelPath);
    const parsed = await parseMemberImportWorkbook(buffer);
    assert.equal(parsed.headerRow, 2, "header row must be 2");
    assert.equal(parsed.rows.length, 49, "49 data rows");

    const preview = await gymMemberImportService.analyzeWorkbook(actor, {
      fileName: "2026_8_10더원체육관회원.xlsx",
      buffer,
    });
    assert.equal(preview.totalRows, 49);
    assert.equal(preview.headerRow, 2);
    assert.equal(preview.counts.duplicateReview, 2, "dup phone 2 rows");
    assert.equal(
      Math.round(preview.counts.amountSum),
      18370000,
      "amount sum",
    );

    const planNames = Object.keys(preview.counts.planNames).sort();
    assert.equal(planNames.length, 7, "7 plans");
    assert.ok(planNames.includes("10회 이용권"));
    assert.ok(planNames.includes("1개월+핸드랩+글러브"));
    assert.equal(preview.counts.groupNames["성인"], 21);
    assert.equal(preview.counts.groupNames["초등부"], 19);
    assert.equal(preview.counts.groupNames["중/고등부"], 8);

    const renewalMeta = preview.rows.filter(
      (r) => r.sourceRegistrationLabel === "재등록",
    ).length;
    assert.equal(renewalMeta, 17, "excel 재등록 meta 17");

    const phoneDup = preview.rows.filter(
      (r) => r.normalizedPhone === "01023983908",
    );
    assert.equal(phoneDup.length, 2);
    assert.ok(phoneDup.every((r) => r.decision === "duplicate_review"));
    assert.ok(phoneDup.some((r) => r.name === "고지윤"));
    assert.ok(phoneDup.some((r) => r.name === "고시윤"));

    // commit: create all plans, create both phone-dup members separately
    const planBindings: Record<string, string> = {};
    for (const row of preview.rows) {
      planBindings[String(row.excelRow)] = row.planId ?? "__create__";
    }
    const memberBindings: Record<string, string> = {};
    for (const row of preview.rows) {
      if (row.decision === "duplicate_review") {
        memberBindings[String(row.excelRow)] = "__create__";
      }
    }

    const first = await gymMemberImportService.commitImport(actor, {
      batchId: preview.batchId,
      fileName: preview.fileName,
      buffer,
      planBindings,
      memberBindings,
      skipRows: [],
      createMissingGroups: true,
    });
    console.log("first import", first);
    assert.equal(first.success, 49, "all 49 success");
    assert.equal(first.failed, 0);

    const memberCount = await prisma.gymMember.count({
      where: { gymId: gym.id, deletedAt: null },
    });
    assert.equal(memberCount, 49);

    const subCount = await prisma.gymMemberSubscription.count({
      where: { gymId: gym.id },
    });
    assert.equal(subCount, 49);

    const payCount = await prisma.gymMemberPayment.count({
      where: { gymId: gym.id },
    });
    assert.equal(payCount, 49);

    const importSubs = await prisma.gymMemberSubscription.findMany({
      where: { gymId: gym.id },
      select: { creationSource: true, sourceRegistrationType: true },
    });
    assert.ok(
      importSubs.every(
        (s) =>
          s.creationSource ===
          GymMemberSubscriptionCreationSource.excel_import,
      ),
    );
    const renewMetaDb = importSubs.filter(
      (s) => s.sourceRegistrationType === "renewal",
    ).length;
    assert.equal(renewMetaDb, 17);

    // second import — idempotent skip
    const preview2 = await gymMemberImportService.analyzeWorkbook(actor, {
      fileName: "2026_8_10더원체육관회원.xlsx",
      buffer,
    });
    assert.ok(
      preview2.counts.skipIdempotent >= 47,
      `expected mostly idempotent, got ${preview2.counts.skipIdempotent}`,
    );
    // remaining may be duplicate_review again for phone pair until bound
    const planBindings2: Record<string, string> = {};
    for (const row of preview2.rows) {
      planBindings2[String(row.excelRow)] = row.planId ?? "__create__";
    }
    const memberBindings2: Record<string, string> = {};
    for (const row of preview2.rows) {
      if (row.decision === "duplicate_review") {
        // match existing by name+phone after first import
        const existing = await prisma.gymMember.findFirst({
          where: {
            gymId: gym.id,
            name: row.name,
            normalizedPhone: row.normalizedPhone,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (existing) memberBindings2[String(row.excelRow)] = existing.id;
      }
    }
    const second = await gymMemberImportService.commitImport(actor, {
      batchId: preview2.batchId,
      fileName: preview2.fileName,
      buffer,
      planBindings: planBindings2,
      memberBindings: memberBindings2,
      skipRows: [],
      createMissingGroups: true,
    });
    console.log("second import", second);
    assert.equal(second.success, 0, "no new success on retry");
    const memberCount2 = await prisma.gymMember.count({
      where: { gymId: gym.id, deletedAt: null },
    });
    assert.equal(memberCount2, 49, "no duplicate members");
    const subCount2 = await prisma.gymMemberSubscription.count({
      where: { gymId: gym.id },
    });
    assert.equal(subCount2, 49, "no duplicate subscriptions");

    // renewal accumulation on one imported member
    const sample = await prisma.gymMember.findFirst({
      where: {
        gymId: gym.id,
        deletedAt: null,
        name: { notIn: ["고지윤", "고시윤"] },
      },
      include: {
        subscriptions: {
          where: { status: { not: "cancelled" } },
          orderBy: { startedAt: "asc" },
        },
      },
    });
    assert.ok(sample);
    const hist0 = await gymMembershipSaleService.listSubscriptionHistory(
      actor,
      sample!.id,
    );
    assert.equal(hist0.totalCount, 1);
    assert.equal(hist0.matchonRenewalCount, 0);

    const plan = await prisma.gymMembershipPlan.findFirst({
      where: { gymId: gym.id, deletedAt: null },
    });
    assert.ok(plan);

    const start1 = new Date("2026-12-01T00:00:00.000Z");
    await gymMembershipSaleService.sellMembership(actor, sample!.id, {
      planId: plan!.id,
      op: "renew",
      startedAt: start1,
      listPrice: 100000,
      discountAmount: 0,
      paidAmount: 100000,
      paymentMethod: GymMemberPaymentMethod.card,
      paidAt: start1,
    });
    const hist1 = await gymMembershipSaleService.listSubscriptionHistory(
      actor,
      sample!.id,
    );
    assert.equal(hist1.totalCount, 2);
    assert.equal(hist1.matchonRenewalCount, 1);

    const start2 = new Date("2027-03-01T00:00:00.000Z");
    await gymMembershipSaleService.sellMembership(actor, sample!.id, {
      planId: plan!.id,
      op: "renew",
      startedAt: start2,
      listPrice: 100000,
      discountAmount: 0,
      paidAmount: 100000,
      paymentMethod: GymMemberPaymentMethod.card,
      paidAt: start2,
    });
    const hist2 = await gymMembershipSaleService.listSubscriptionHistory(
      actor,
      sample!.id,
    );
    assert.equal(hist2.totalCount, 3);
    assert.equal(hist2.matchonRenewalCount, 2);
    assert.ok(
      hist2.rows.some((r) => r.isImport && r.sequence === 1),
      "import baseline sequence 1",
    );

    // excel 재등록 must not count
    const excelRenewalOnly = await prisma.gymMember.findFirst({
      where: {
        gymId: gym.id,
        subscriptions: {
          some: {
            creationSource: GymMemberSubscriptionCreationSource.excel_import,
            sourceRegistrationType: "renewal",
          },
        },
      },
    });
    assert.ok(excelRenewalOnly);
    const histExcel = await gymMembershipSaleService.listSubscriptionHistory(
      actor,
      excelRenewalOnly!.id,
    );
    // if this member only has import sub
    if (histExcel.totalCount === 1) {
      assert.equal(histExcel.matchonRenewalCount, 0);
    }

    console.log("E2E PASS renewal 0→1→2 / idempotency / 49 import");
    await cleanup();
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
