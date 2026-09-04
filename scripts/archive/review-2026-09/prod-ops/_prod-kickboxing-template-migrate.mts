/**
 * Production migrate deploy for gym member profile template ONLY.
 * yamabiko fingerprint required. No GymMember/Fighter writes except seed inserts in migration.
 *
 *   npx tsx scripts/_prod-kickboxing-template-migrate.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, renameSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const OUT = join(process.cwd(), "test-results", "prod-kickboxing-template-migrate");
mkdirSync(OUT, { recursive: true });

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_PG = "9133eb46-6e18-4596-a374-babb4311f75a";
const TARGET_MIGRATION = "20260902143000_gym_member_profile_template";
const UNRELATED_MIG = "20260902120000_association_schedule_related_event";

function railwayProdPgVars(): Record<string, string> {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${PROD_PG} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function fingerprint(url: string) {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  return { host, yamabiko: /yamabiko/i.test(host), yamanote: /yamanote/i.test(host) };
}

function assertSqlAdditive() {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations",
      TARGET_MIGRATION,
      "migration.sql",
    ),
    "utf8",
  );
  const banned = [
    /UPDATE\s+"GymMember"/i,
    /UPDATE\s+"Gym"/i,
    /UPDATE\s+"Fighter"/i,
    /UPDATE\s+"EventApplication"/i,
    /UPDATE\s+"BracketMatch"/i,
    /UPDATE\s+"MatchResult"/i,
    /^\s*DELETE\b/im,
    /^\s*DROP\b/im,
  ];
  for (const re of banned) {
    if (re.test(sql)) {
      throw new Error(`REFUSING: migration SQL matches banned pattern ${re}`);
    }
  }
  if (!/CREATE TABLE "MemberSportTemplate"/i.test(sql)) {
    throw new Error("REFUSING: expected MemberSportTemplate create");
  }
  console.log("SQL additive check: OK");
}

async function main() {
  assertSqlAdditive();

  const pgVars = railwayProdPgVars();
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  const fp = fingerprint(dbUrl);
  console.log("DB fingerprint:", { host: fp.host, yamabiko: fp.yamabiko });
  if (!fp.yamabiko || fp.yamanote) {
    throw new Error("REFUSING: expected production yamabiko DB");
  }

  // Isolate uncommitted unrelated migration so deploy cannot apply it
  const unrelatedPath = join(process.cwd(), "prisma/migrations", UNRELATED_MIG);
  const parkPath = join(process.cwd(), "test-results", "_parked_" + UNRELATED_MIG);
  let parked = false;
  if (existsSync(unrelatedPath)) {
    if (existsSync(parkPath)) {
      throw new Error(`park path already exists: ${parkPath}`);
    }
    renameSync(unrelatedPath, parkPath);
    parked = true;
    console.log("Parked unrelated migration:", UNRELATED_MIG);
  }

  process.env.DATABASE_URL = dbUrl;
  process.env.DIRECT_URL = dbUrl;

  try {
    let statusBefore = "";
    try {
      statusBefore = execSync("npx prisma migrate status", {
        encoding: "utf8",
        env: process.env,
      });
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      statusBefore = `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
      // Known drift: DB has 20260828120000_event_application_structural_audit not in repo.
      // Allow continue only if the sole pending local migration is our target.
      const hasFailed = /failed migration|P3009|P3018/i.test(statusBefore);
      const pendingOurs = statusBefore.includes(TARGET_MIGRATION);
      const unexpectedPending =
        /The migration have not yet been applied:[\s\S]*?(?=The migration from the database|$)/i
          .exec(statusBefore)?.[0]
          ?.split("\n")
          .map((l) => l.trim())
          .filter((l) => /^\d{14}_/.test(l))
          .filter((l) => l !== TARGET_MIGRATION) ?? [];
      if (hasFailed) throw new Error("REFUSING: failed migration present\n" + statusBefore);
      if (!pendingOurs && !/up to date/i.test(statusBefore)) {
        throw new Error("REFUSING: unexpected migrate status\n" + statusBefore);
      }
      if (unexpectedPending.length > 0) {
        throw new Error(
          "REFUSING: unexpected pending migrations: " +
            unexpectedPending.join(", "),
        );
      }
      console.log(
        "NOTE: migrate status exit!=0 (known missing local historical migration). Continuing.",
      );
    }
    writeFileSync(join(OUT, "status-before.txt"), statusBefore);
    console.log("--- status before ---\n" + statusBefore);

    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const countBefore = await prisma.gymMember.count({ where: { deletedAt: null } });
    const sampleBefore = await prisma.gymMember.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        birthDate: true,
        gender: true,
        email: true,
        joinedAt: true,
        memberNumber: true,
        status: true,
        address: true,
        memo: true,
      },
    });
    const eaBefore = await prisma.eventApplication.count();
    const bmBefore = await prisma.bracketMatch.count();
    const gymTplBefore = await prisma.$queryRawUnsafe<
      Array<{ null_count: bigint; non_null: bigint }>
    >(`
      SELECT
        COUNT(*) FILTER (WHERE "memberSportTemplateId" IS NULL)::bigint AS null_count,
        COUNT(*) FILTER (WHERE "memberSportTemplateId" IS NOT NULL)::bigint AS non_null
      FROM "Gym"
    `).catch(async () => {
      // column may not exist yet
      return [{ null_count: BigInt(-1), non_null: BigInt(-1) }];
    });

    writeFileSync(
      join(OUT, "baseline.json"),
      JSON.stringify(
        {
          countBefore,
          sampleBefore,
          eaBefore,
          bmBefore,
          gymTplBefore: gymTplBefore.map((r) => ({
            null_count: Number(r.null_count),
            non_null: Number(r.non_null),
          })),
        },
        null,
        2,
      ),
    );
    console.log("Baseline GymMember count:", countBefore);
    console.log("Baseline EventApplication:", eaBefore, "BracketMatch:", bmBefore);

    const alreadyApplied = !statusBefore.includes(TARGET_MIGRATION);
    if (!alreadyApplied) {
      console.log("Applying prisma migrate deploy...");
      const deployOut = execSync("npx prisma migrate deploy", {
        encoding: "utf8",
        env: process.env,
      });
      writeFileSync(join(OUT, "deploy.txt"), deployOut);
      console.log(deployOut);
    } else {
      console.log("Target migration already applied — verify only");
    }

    const statusAfter = (() => {
      try {
        return execSync("npx prisma migrate status", {
          encoding: "utf8",
          env: process.env,
        });
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string };
        return `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
      }
    })();
    writeFileSync(join(OUT, "status-after.txt"), statusAfter);
    console.log("--- status after ---\n" + statusAfter);
    const stillPendingOurs = /have not yet been applied:[\s\S]*20260902143000_gym_member_profile_template/i.test(
      statusAfter,
    );
    if (stillPendingOurs) {
      throw new Error("FAIL: target migration still pending after deploy");
    }
    if (/failed migration|P3009|P3018/i.test(statusAfter)) {
      throw new Error("FAIL: failed migration after deploy");
    }

    const countAfter = await prisma.gymMember.count({ where: { deletedAt: null } });
    const sampleAfter = await prisma.gymMember.findMany({
      where: { id: { in: sampleBefore.map((m) => m.id) } },
      select: {
        id: true,
        name: true,
        phone: true,
        birthDate: true,
        gender: true,
        email: true,
        joinedAt: true,
        memberNumber: true,
        status: true,
        address: true,
        memo: true,
      },
    });
    const eaAfter = await prisma.eventApplication.count();
    const bmAfter = await prisma.bracketMatch.count();

    const ser = (rows: typeof sampleBefore) =>
      JSON.stringify(
        rows
          .map((m) => ({
            ...m,
            birthDate: m.birthDate?.toISOString() ?? null,
            joinedAt: m.joinedAt?.toISOString() ?? null,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      );

    const coreDelta = ser(sampleBefore) !== ser(sampleAfter);
    const countDelta = countAfter - countBefore;
    const eaDelta = eaAfter - eaBefore;
    const bmDelta = bmAfter - bmBefore;

    const tpl = await prisma.memberSportTemplate.findUnique({
      where: { code: "KICKBOXING" },
      include: { fields: { where: { active: true } } },
    });
    const gymNonNullTpl = await prisma.gym.count({
      where: { memberSportTemplateId: { not: null } },
    });

    const report = {
      countBefore,
      countAfter,
      countDelta,
      coreDelta,
      eaDelta,
      bmDelta,
      kickboxingTemplate: {
        id: tpl?.id ?? null,
        fieldCount: tpl?.fields.length ?? 0,
      },
      gymsWithTemplate: gymNonNullTpl,
    };
    writeFileSync(join(OUT, "after.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (coreDelta) throw new Error("FAIL: sample core field delta != 0");
    if (countDelta !== 0) throw new Error("FAIL: GymMember count changed");
    if (eaDelta !== 0 || bmDelta !== 0) {
      throw new Error("FAIL: EventApplication/BracketMatch count changed");
    }
    if (!tpl) throw new Error("FAIL: KICKBOXING template missing after migrate");
    if (tpl.fields.length < 7) throw new Error("FAIL: KICKBOXING fields incomplete");

    // Auto-apply should be none for existing gyms (seed does not UPDATE Gym)
    console.log("Gyms with memberSportTemplateId set:", gymNonNullTpl);

    await prisma.$disconnect();
    await pool.end();
    console.log("PROD MIGRATE VERIFY: ALL OK");
  } finally {
    if (parked && existsSync(parkPath) && !existsSync(unrelatedPath)) {
      renameSync(parkPath, unrelatedPath);
      console.log("Restored unrelated migration folder");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
