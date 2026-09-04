/**
 * Production READ-ONLY multi-sport smoke (HTTP + optional login pages).
 * Does not mutate gym/member sports.
 *   npx tsx scripts/_prod-multi-sport-smoke.ts
 */
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_PG = "9133eb46-6e18-4596-a374-babb4311f75a";
const PROD_APP = "d9575ee0-a2e2-46c2-9221-b16ea4b8df96";
const BASE = "https://app-production-79ad.up.railway.app";

function railwayJson(service: string) {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const pgVars = railwayJson(PROD_PG);
  const appVars = railwayJson(PROD_APP);
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamabiko/i.test(dbUrl)) throw new Error("not yamabiko");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const gym = await prisma.gym.findUnique({
    where: { id: "cmsit3cjd00010po9dlgurpip" },
    select: {
      name: true,
      memberSportTemplateId: true,
      ownerUser: { select: { loginId: true } },
      sportTemplateAssignments: {
        where: { isActive: true },
        select: { templateId: true, template: { select: { name: true } } },
      },
    },
  });
  const admin = await prisma.user.findFirst({
    where: { role: "admin", loginId: { not: null } },
    select: { loginId: true },
  });
  const member = await prisma.gymMember.findFirst({
    where: { gymId: "cmsit3cjd00010po9dlgurpip", deletedAt: null },
    select: { id: true, name: true, memberNumber: true },
    orderBy: { createdAt: "desc" },
  });

  const password = String(appVars.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const results: Record<string, unknown> = {
    gymLoginId: gym?.ownerUser.loginId ?? null,
    adminLoginId: admin?.loginId ?? null,
    assignmentNames: gym?.sportTemplateAssignments.map((a) => a.template.name),
    legacyFk: gym?.memberSportTemplateId ?? null,
  };

  // Signup READ smoke (no submit)
  await page.goto(`${BASE}/join/gym`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const signupText = await page.locator("body").innerText();
  results.signup = {
    statusOk: !signupText.includes("Application error"),
    hasSection: signupText.includes("운영 종목"),
    hasKickboxing: signupText.includes("킥복싱"),
    url: page.url(),
  };

  async function login(loginId: string) {
    await page.context().clearCookies();
    await page.goto(`${BASE}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const id = page
      .locator('#login-identifier, input[name="identifier"], input[type="text"]')
      .first();
    await id.waitFor({ timeout: 45000 });
    await id.fill(loginId);
    await page
      .locator('input[name="password"], #login-password, input[type="password"]')
      .first()
      .fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), {
      timeout: 90000,
    });
  }

  const adminLogin = admin?.loginId || "admin";
  const gymLogin = gym?.ownerUser.loginId || null;
  results.gymLoginId = gymLogin;
  results.adminLoginId = adminLogin;

  // Print signup early so login failures don't hide it
  console.log(
    JSON.stringify({ phase: "signup", result: results.signup }, null, 2),
  );

  if (adminLogin) {
    try {
      await login(adminLogin);
      await page.goto(`${BASE}/admin/member-sport-templates`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const text = await page.locator("body").innerText();
      results.admin = {
        url: page.url(),
        ok:
          !text.includes("Application error") &&
          page.url().includes("/admin/member-sport-templates"),
        hasKickboxing: text.includes("킥복싱") || text.includes("KICKBOXING"),
        hasUsage: /사용/.test(text) || /체육관/.test(text),
      };
    } catch (e) {
      results.admin = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  if (gymLogin) {
    try {
      await login(gymLogin);
      await page.goto(`${BASE}/gym/member-custom-fields`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const settingsText = await page.locator("body").innerText();
      results.gymSettings = {
        url: page.url(),
        ok: !settingsText.includes("Application error"),
        hasUsageSection: settingsText.includes("사용 종목"),
        hasKickboxing: settingsText.includes("킥복싱"),
      };

      await page.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const listText = await page.locator("body").innerText();
      results.memberList = {
        url: page.url(),
        ok:
          !listText.includes("Application error") &&
          page.url().includes("/gym/members"),
      };

      if (member) {
        await page.goto(`${BASE}/gym/members/${member.id}`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        const detailText = await page.locator("body").innerText();
        results.memberDetail = {
          url: page.url(),
          ok: !detailText.includes("Application error"),
          memberNameVisible: detailText.includes(member.name),
        };

        await page.goto(`${BASE}/gym/members/${member.id}/edit`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        const editText = await page.locator("body").innerText();
        results.memberEdit = {
          url: page.url(),
          ok: !editText.includes("Application error"),
          hasMemberSport:
            editText.includes("회원 종목") || editText.includes("킥복싱"),
        };
      }
    } catch (e) {
      results.gym = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const hydration = consoleErrors.filter(
    (e) =>
      /hydrat/i.test(e) ||
      /Minified React error #418/i.test(e) ||
      /#418/i.test(e),
  );

  results.console = {
    errorCount: consoleErrors.length,
    hydrationOr418: hydration.length,
    sample: consoleErrors.slice(0, 5),
  };

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
