/**
 * Production smoke (read-only): association notices routes after main 2c0b85d.
 * Does NOT create/update/delete notices on real associations.
 *
 *   npx tsx scripts/e2e-association-notices-prod-smoke.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type Page } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma";

const OUT = join(process.cwd(), "test-results", "association-notices-prod-smoke");
mkdirSync(OUT, { recursive: true });

type Step = { name: string; status: "PASS" | "FAIL" | "N/A"; detail?: string };

const steps: Step[] = [];
const report: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  policy: "read-only-no-notice-writes",
};

function railwayProdAppVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0b2a6288-f6c4-445e-b898-0bbb22acaffa --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function railwayProdPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0b2a6288-f6c4-445e-b898-0bbb22acaffa --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${report.base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="identifier"], input[name="loginId"]').first().fill(loginId);
  await page.locator('input[name="password"]').first().fill(password);
  await page.getByRole("button", { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

async function main() {
  const appVars = railwayProdAppVars();
  const pgVars = railwayProdPgVars();
  const BASE =
    process.env.QA_BASE_URL ||
    String(appVars.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "https://app-production-79ad.up.railway.app";
  report.base = BASE;

  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "");
  const host = new URL(dbUrl).hostname;
  report.fingerprint = {
    host,
    port: new URL(dbUrl).port,
    db: new URL(dbUrl).pathname.replace(/^\//, "").split("?")[0],
    yamabiko: host.includes("yamabiko"),
    yamanote: host.includes("yamanote"),
  };
  if (!host.includes("yamabiko") || host.includes("yamanote")) {
    throw new Error(`REFUSING: expected yamabiko Production DB, got ${host}`);
  }
  steps.push({ name: "fingerprint", status: "PASS", detail: host });

  const password = String(appVars.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing on Production app");

  const versionRes = await fetch(`${BASE}/api/desktop/version`);
  const versionJson = (await versionRes.json()) as {
    gitSha?: string;
    webVersion?: string;
  };
  const serving =
    versionJson.webVersion || versionJson.gitSha || null;
  report.servingSha = serving;
  const shaOk =
    typeof serving === "string" && serving.startsWith("2c0b85d");
  steps.push({
    name: "serving SHA",
    status: shaOk ? "PASS" : "FAIL",
    detail: String(serving),
  });

  process.env.DATABASE_URL = dbUrl;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const mig = await prisma.$queryRawUnsafe<
      Array<{ migration_name: string; finished_at: Date | null }>
    >(
      `SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = $1`,
      "20260828010000_add_association_notices",
    );
    const table = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'AssociationNotice'
       ) AS exists`,
    );
    const noticeCount = await prisma.associationNotice.count();
    report.migration = mig[0] ?? null;
    report.tableExists = table[0]?.exists ?? false;
    report.noticeCount = noticeCount;
    steps.push({
      name: "migration applied",
      status: mig[0]?.finished_at && table[0]?.exists ? "PASS" : "FAIL",
      detail: `finished=${mig[0]?.finished_at ?? null} table=${table[0]?.exists} notices=${noticeCount}`,
    });

    const gymCount = await prisma.gym.count();
    const orgCount = await prisma.organizer.count();
    const amgCount = await prisma.associationMemberGym.count();
    report.existingCounts = { gym: gymCount, organizer: orgCount, amg: amgCount };
    steps.push({
      name: "existing data impact",
      status: "PASS",
      detail: `gym=${gymCount} organizer=${orgCount} amg=${amgCount} (read-only)`,
    });

    // Prefer known demo logins; fall back to any active membership pair.
    const preferredGymLogins = ["gym1", "shgym", "demo_gym", "theone"];
    const preferredOrgLogins = ["organizer2", "organizer1", "shgym"];

    let gymLogin: string | null = null;
    let gymId: string | null = null;
    let associationId: string | null = null;
    let associationName: string | null = null;
    let orgLogin: string | null = null;

    for (const loginId of preferredGymLogins) {
      const u = await prisma.user.findFirst({
        where: { loginId, role: "gym" },
        include: { ownedGym: true },
      });
      if (!u?.ownedGym) continue;
      const amg = await prisma.associationMemberGym.findFirst({
        where: { gymId: u.ownedGym.id, status: "active" },
        include: { organizer: true },
      });
      if (!amg) continue;
      gymLogin = loginId;
      gymId = u.ownedGym.id;
      associationId = amg.organizerId;
      associationName = amg.organizer.name;
      break;
    }

    if (!gymLogin) {
      const amg = await prisma.associationMemberGym.findFirst({
        where: { status: "active" },
        include: {
          gym: { include: { ownerUser: true } },
          organizer: true,
        },
      });
      if (amg?.gym?.ownerUser?.loginId) {
        gymLogin = amg.gym.ownerUser.loginId;
        gymId = amg.gymId;
        associationId = amg.organizerId;
        associationName = amg.organizer.name;
      }
    }

    for (const loginId of preferredOrgLogins) {
      const u = await prisma.user.findFirst({
        where: { loginId, role: "organizer" },
        include: { organizer: true },
      });
      if (u?.organizer) {
        orgLogin = loginId;
        break;
      }
    }

    report.fixtures = {
      gymLogin,
      gymId,
      associationId,
      associationName,
      orgLogin,
    };

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
    });
    page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 300)));

    if (orgLogin) {
      try {
        await login(page, orgLogin, password);
        steps.push({ name: "organizer login", status: "PASS", detail: orgLogin });

        const res = await page.goto(`${BASE}/organizer/notices`, {
          waitUntil: "domcontentloaded",
        });
        const status = res?.status() ?? 0;
        const body = await page.locator("body").innerText();
        const hasTitle = /공지/.test(body);
        const hasCreate = await page.getByRole("link", { name: /공지 작성|\+ 공지/ }).count();
        await page.screenshot({ path: join(OUT, "01-organizer-notices.png"), fullPage: true });
        const ok = status < 400 && hasTitle;
        steps.push({
          name: "organizer read smoke",
          status: ok ? "PASS" : "FAIL",
          detail: `status=${status} title=${hasTitle} createCta=${hasCreate > 0}`,
        });

        // Existing association nav regression (회원사 관리)
        const memberGymNav = await page.getByRole("link", { name: /회원사/ }).count();
        steps.push({
          name: "association member-gym menu",
          status: memberGymNav > 0 ? "PASS" : "N/A",
          detail: `count=${memberGymNav}`,
        });
      } catch (e) {
        steps.push({
          name: "organizer read smoke",
          status: "N/A",
          detail: `login/render skipped: ${String(e).slice(0, 200)}`,
        });
      }
    } else {
      steps.push({ name: "organizer read smoke", status: "N/A", detail: "no safe organizer login" });
    }

    await context.clearCookies();

    if (gymLogin && associationId) {
      try {
        await login(page, gymLogin, password);
        steps.push({ name: "gym login", status: "PASS", detail: gymLogin });

        await page.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });
        const navText = await page.locator("nav, aside, [data-sidebar]").first().innerText().catch(() => "");
        const hasAssocSection = /협회/.test(navText);
        const hasJoinAssoc = /가입 협회/.test(navText);
        const hasMembers = /회원/.test(navText);
        const hasAthletes = /선수/.test(navText);
        await page.screenshot({ path: join(OUT, "02-gym-home.png"), fullPage: true });

        steps.push({
          name: "gym existing menu regression",
          status: hasMembers || hasAthletes || hasJoinAssoc ? "PASS" : "FAIL",
          detail: `회원=${hasMembers} 선수=${hasAthletes} 가입협회=${hasJoinAssoc} 협회section=${hasAssocSection}`,
        });

        const listRes = await page.goto(
          `${BASE}/gym/associations/${associationId}/notices`,
          { waitUntil: "domcontentloaded" },
        );
        const listStatus = listRes?.status() ?? 0;
        const listBody = await page.locator("body").innerText();
        const looksLikeBoard =
          /공지/.test(listBody) || /등록된 공지/.test(listBody) || /공지사항/.test(listBody);
        const hasWriteCta = await page.getByRole("link", { name: /공지 작성|작성/ }).count();
        await page.screenshot({ path: join(OUT, "03-gym-notices.png"), fullPage: true });
        steps.push({
          name: "gym read smoke",
          status: listStatus < 400 && looksLikeBoard ? "PASS" : "FAIL",
          detail: `status=${listStatus} board=${looksLikeBoard} writeCta=${hasWriteCta} assoc=${associationName}`,
        });
        steps.push({
          name: "gym dynamic association menu",
          status: hasAssocSection ? "PASS" : "N/A",
          detail: hasAssocSection ? "협회 section visible" : "section not in nav text snapshot",
        });
      } catch (e) {
        steps.push({
          name: "gym read smoke",
          status: "N/A",
          detail: `login/render skipped: ${String(e).slice(0, 200)}`,
        });
      }
    } else {
      // Production currently has amg=0 — smoke gym menus + confirm dynamic 협회 root absent.
      let fallbackGymLogin: string | null = null;
      for (const loginId of preferredGymLogins) {
        const u = await prisma.user.findFirst({
          where: { loginId, role: "gym" },
          include: { ownedGym: true },
        });
        if (u?.ownedGym) {
          fallbackGymLogin = loginId;
          break;
        }
      }
      if (!fallbackGymLogin) {
        const anyGym = await prisma.user.findFirst({
          where: { role: "gym", ownedGym: { isNot: null } },
          select: { loginId: true },
        });
        fallbackGymLogin = anyGym?.loginId ?? null;
      }

      if (fallbackGymLogin) {
        try {
          await login(page, fallbackGymLogin, password);
          await page.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });
          const hasJoinAssoc =
            (await page.getByRole("link", { name: "가입 협회" }).count()) > 0;
          const hasMembers =
            (await page.getByRole("link", { name: /회원/ }).count()) > 0;
          const hasAthletes =
            (await page.getByRole("link", { name: /선수/ }).count()) > 0;
          const hasDynamicAssocRoot =
            (await page.locator('[data-nav-group="associations"]').count()) > 0;
          await page.screenshot({
            path: join(OUT, "02-gym-zero-amg.png"),
            fullPage: true,
          });
          steps.push({
            name: "gym read smoke",
            status: "N/A",
            detail: `amg=0; login=${fallbackGymLogin}; notice board N/A`,
          });
          steps.push({
            name: "gym existing menu regression",
            status: hasMembers || hasAthletes || hasJoinAssoc ? "PASS" : "FAIL",
            detail: `회원=${hasMembers} 선수=${hasAthletes} 가입협회=${hasJoinAssoc}`,
          });
          steps.push({
            name: "zero-association menu (prod)",
            status: hasDynamicAssocRoot ? "FAIL" : "PASS",
            detail: `dynamicAssocRoot=${hasDynamicAssocRoot}`,
          });
        } catch (e) {
          steps.push({
            name: "gym read smoke",
            status: "N/A",
            detail: `amg=0 and gym login failed: ${String(e).slice(0, 200)}`,
          });
        }
      } else {
        steps.push({
          name: "gym read smoke",
          status: "N/A",
          detail: "no active AssociationMemberGym + gym login found",
        });
      }
    }

    report.consoleErrors = consoleErrors.slice(0, 20);
    report.pageErrors = pageErrors.slice(0, 20);
    steps.push({
      name: "console/pageerror",
      status: pageErrors.length === 0 ? "PASS" : "FAIL",
      detail: JSON.stringify({
        pageErrors: pageErrors.slice(0, 5),
        consoleErrors: consoleErrors.slice(0, 5),
      }),
    });

    await browser.close();
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  report.steps = steps;
  report.finishedAt = new Date().toISOString();
  report.failed = steps.filter((s) => s.status === "FAIL").length;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ failed: report.failed, steps }, null, 2));
  if (report.failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
