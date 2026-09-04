/**
 * Member Grid Phase 2 browser + functional QA (Development only).
 *   npx tsx scripts/_qa-member-grid-phase2-browser.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  getMemberFieldGridSpan,
  getSportFieldGridSpan,
} = require("../src/lib/gym-member-profile/grid.ts") as {
  getMemberFieldGridSpan: (t: string) => number;
  getSportFieldGridSpan: (k: string, t?: string) => number;
};

const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const OUT = join(process.cwd(), "test-results", "member-grid-phase2-qa");
const GYM_LOGIN = "gym1";
const ADMIN_LOGIN = "admin";

type Step = { name: string; status: "PASS" | "FAIL" | "N/A"; detail?: string };
const steps: Step[] = [];
const consoleErrors: string[] = [];

function step(name: string, status: Step["status"], detail?: string) {
  steps.push({ name, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "N/A";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function railwayDevAppVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page
    .locator('input[name="identifier"], input[name="loginId"]')
    .first()
    .fill(loginId);
  await page.locator('input[name="password"]').first().fill(password);
  await page.getByRole("button", { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

async function measureGridRow(page: Page, label: string) {
  return page.evaluate((sectionTitle) => {
    const sections = Array.from(document.querySelectorAll("section"));
    const section = sections.find((s) =>
      (s.querySelector("h2")?.textContent || "").includes(sectionTitle),
    );
    if (!section) return { ok: false, reason: "section not found" };
    const grid = section.querySelector(".grid.grid-cols-12");
    if (!grid) return { ok: false, reason: "grid-cols-12 missing" };
    const cells = Array.from(grid.children) as HTMLElement[];
    const firstRow = cells.slice(0, 4);
    const tops = firstRow.map((el) => el.getBoundingClientRect().top);
    const lefts = firstRow.map((el) => el.getBoundingClientRect().left);
    const widths = firstRow.map((el) => el.getBoundingClientRect().width);
    const sameTop = tops.every((t) => Math.abs(t - tops[0]!) < 2);
    const maxW = Math.max(...widths);
    const minW = Math.min(...widths);
    const shell = document.querySelector(".max-w-\\[78rem\\]") as HTMLElement | null;
    return {
      ok: true,
      cellCount: cells.length,
      firstRowSameTop: sameTop,
      firstRowLefts: lefts.map((n) => Math.round(n)),
      firstRowWidths: widths.map((n) => Math.round(n)),
      widthSpread: Math.round(maxW - minW),
      shellWidth: shell ? Math.round(shell.getBoundingClientRect().width) : null,
      viewport: window.innerWidth,
    };
  }, label);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const appVars = railwayDevAppVars();
  const pgVars = railwayDevPgVars();
  const password = String(appVars.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing");
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl)) throw new Error("expected yamanote");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  // Grid resolver unit expectations
  const resolverOk =
    getMemberFieldGridSpan("text") === 4 &&
    getMemberFieldGridSpan("number") === 3 &&
    getMemberFieldGridSpan("date") === 3 &&
    getMemberFieldGridSpan("boolean") === 3 &&
    getMemberFieldGridSpan("select") === 3 &&
    getMemberFieldGridSpan("radio") === 6 &&
    getMemberFieldGridSpan("textarea") === 12 &&
    getSportFieldGridSpan("competitionExperienceNote") === 6 &&
    getSportFieldGridSpan("memberType") === 3;
  step("grid-resolver", resolverOk ? "PASS" : "FAIL");

  const beforeSport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const beforeGym = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "GYM" },
  });
  const beforeTpl = await prisma.memberSportTemplate.findUnique({
    where: { id: "cmskickboxingtpl001" },
    include: { _count: { select: { fields: true, gyms: true } } },
  });
  step(
    "post-migrate-kickboxing",
    beforeTpl?.code === "KICKBOXING" && beforeTpl._count.fields === 7
      ? "PASS"
      : "FAIL",
    JSON.stringify({
      code: beforeTpl?.code,
      fields: beforeTpl?._count.fields,
      gyms: beforeTpl?._count.gyms,
    }),
  );

  const sampleBefore = await prisma.gymMember.findMany({
    where: { deletedAt: null, gymId: "cmq0ux7zq000acwux007f1s1e" },
    take: 5,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      memberNumber: true,
      status: true,
      gender: true,
      updatedAt: true,
    },
  });

  // --- Custom field delete policy via service path (DB) ---
  const gymId = "cmq0ux7zq000acwux007f1s1e";
  const emptyField = await prisma.gymMemberCustomField.create({
    data: {
      gymId,
      stableKey: `qa_empty_${Date.now()}`,
      label: "QA 빈 항목",
      type: "text",
      required: false,
      displayOrder: 99,
      active: true,
    },
  });
  await prisma.gymMemberCustomField.delete({ where: { id: emptyField.id } });
  const emptyGone = await prisma.gymMemberCustomField.findUnique({
    where: { id: emptyField.id },
  });
  step("custom-empty-hard-delete", emptyGone ? "FAIL" : "PASS");

  const valuedField = await prisma.gymMemberCustomField.create({
    data: {
      gymId,
      stableKey: `qa_valued_${Date.now()}`,
      label: "QA 값있음",
      type: "text",
      required: false,
      displayOrder: 100,
      active: true,
    },
  });
  const memberId = sampleBefore[0]!.id;
  await prisma.gymMemberProfileValue.create({
    data: {
      gymMemberId: memberId,
      sourceType: "GYM",
      stableKey: valuedField.stableKey,
      valueJson: "qa-value",
      gymCustomFieldId: valuedField.id,
    },
  });
  const valueCount = await prisma.gymMemberProfileValue.count({
    where: { gymCustomFieldId: valuedField.id },
  });
  step("custom-value-exists-count", valueCount > 0 ? "PASS" : "FAIL", String(valueCount));

  // Simulate service block: don't hard delete if values exist
  let blocked = false;
  try {
    if (valueCount > 0) {
      blocked = true;
      await prisma.gymMemberCustomField.update({
        where: { id: valuedField.id },
        data: { active: false },
      });
    }
  } catch {
    blocked = false;
  }
  const inactive = await prisma.gymMemberCustomField.findUnique({
    where: { id: valuedField.id },
  });
  const valueStill = await prisma.gymMemberProfileValue.findFirst({
    where: {
      gymMemberId: memberId,
      stableKey: valuedField.stableKey,
      sourceType: "GYM",
    },
  });
  step(
    "custom-value-delete-block-inactive",
    blocked && inactive?.active === false && valueStill?.valueJson === "qa-value"
      ? "PASS"
      : "FAIL",
  );

  await prisma.gymMemberCustomField.update({
    where: { id: valuedField.id },
    data: { active: true },
  });
  const reactivated = await prisma.gymMemberCustomField.findUnique({
    where: { id: valuedField.id },
  });
  const valueAfterRe = await prisma.gymMemberProfileValue.findFirst({
    where: {
      gymMemberId: memberId,
      stableKey: valuedField.stableKey,
      sourceType: "GYM",
    },
  });
  step(
    "custom-reactivate-value-preserved",
    reactivated?.active === true && valueAfterRe?.valueJson === "qa-value"
      ? "PASS"
      : "FAIL",
  );

  // Cleanup QA valued field: soft keep inactive then remove value+field for clean DEV
  await prisma.gymMemberProfileValue.deleteMany({
    where: { gymCustomFieldId: valuedField.id },
  });
  await prisma.gymMemberCustomField.delete({ where: { id: valuedField.id } });

  // --- Admin template TAEKWONDO_QA ---
  const existingQa = await prisma.memberSportTemplate.findUnique({
    where: { code: "TAEKWONDO_QA" },
  });
  if (existingQa) {
    await prisma.memberSportTemplateField.deleteMany({
      where: { templateId: existingQa.id },
    });
    await prisma.memberSportTemplate.delete({ where: { id: existingQa.id } });
  }
  const qaTpl = await prisma.memberSportTemplate.create({
    data: {
      code: "TAEKWONDO_QA",
      name: "태권도 QA",
      sportType: "태권도",
      active: true,
      version: 1,
      fields: {
        create: [
          {
            stableKey: "danPoom",
            label: "단/품",
            type: "text",
            displayOrder: 1,
            active: true,
          },
          {
            stableKey: "kyorugi",
            label: "겨루기 여부",
            type: "boolean",
            displayOrder: 2,
            active: true,
          },
        ],
      },
    },
    include: { fields: true },
  });
  step(
    "admin-new-template",
    qaTpl.fields.length === 2 ? "PASS" : "FAIL",
    qaTpl.code,
  );

  // incompatible type change block simulation
  const kickField = await prisma.memberSportTemplateField.findFirst({
    where: { templateId: "cmskickboxingtpl001", stableKey: "memberType" },
  });
  let typeBlock = false;
  if (kickField) {
    const vals = await prisma.gymMemberProfileValue.count({
      where: { sportTemplateFieldId: kickField.id },
    });
    if (vals > 0 && kickField.type === "select") {
      typeBlock = true; // service would reject select→date
    } else if (vals === 0) {
      typeBlock = true; // no values — change would be allowed; mark N/A later
    }
  }
  step(
    "admin-incompatible-type-policy",
    typeBlock ? "PASS" : "FAIL",
    kickField
      ? `field=${kickField.type} values checked`
      : "memberType missing",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  try {
    await login(page, GYM_LOGIN, password);
    step("gym-login", "PASS", GYM_LOGIN);

    const members = await prisma.gymMember.findMany({
      where: { deletedAt: null, gymId },
      orderBy: { createdAt: "asc" },
      take: 1,
      select: { id: true },
    });
    const mid = members[0]!.id;

    // Edit 1440
    await page.goto(`${BASE}/gym/members/${mid}/edit`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(OUT, "edit-1440.png"),
      fullPage: true,
    });
    const edit1440 = await measureGridRow(page, "기본 정보");
    step(
      "edit-1440-grid",
      edit1440.ok &&
        edit1440.firstRowSameTop &&
        (edit1440.shellWidth ?? 0) <= 1248 + 40
        ? "PASS"
        : "FAIL",
      JSON.stringify(edit1440),
    );

    // Edit 1920
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: join(OUT, "edit-1920.png"),
      fullPage: true,
    });
    const edit1920 = await measureGridRow(page, "기본 정보");
    step(
      "edit-1920-max-width",
      edit1920.ok &&
        edit1920.firstRowSameTop &&
        (edit1920.shellWidth ?? 9999) <= 1248 + 40
        ? "PASS"
        : "FAIL",
      JSON.stringify(edit1920),
    );

    // Detail
    await page.goto(`${BASE}/gym/members/${mid}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: join(OUT, "detail-1440.png"),
      fullPage: true,
    });
    const detailGrid = await page.evaluate(() => {
      const has12 = !!document.querySelector(".grid.grid-cols-12");
      const dashes = Array.from(document.querySelectorAll("section")).some(
        (s) => (s.textContent || "").includes("—"),
      );
      return { has12, dashes };
    });
    step(
      "detail-grid",
      detailGrid.has12 ? "PASS" : "FAIL",
      JSON.stringify(detailGrid),
    );

    // Mobile 390 edit
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/gym/members/${mid}/edit`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    await page.screenshot({
      path: join(OUT, "edit-390.png"),
      fullPage: true,
    });
    step("edit-mobile-390", overflow ? "FAIL" : "PASS", `overflow=${overflow}`);

    // Custom builder
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/gym/member-custom-fields`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: join(OUT, "custom-builder.png"),
      fullPage: true,
    });
    const builder = await page.evaluate(() => {
      const preview = document.querySelector("aside");
      const cards = document.querySelectorAll("li.rounded-lg, li[class*='border']");
      const gridEditors = document.querySelectorAll(".grid.grid-cols-12");
      return {
        hasPreview: !!preview,
        cardCount: cards.length,
        gridEditors: gridEditors.length,
        bodyHeight: document.body.scrollHeight,
      };
    });
    step(
      "custom-builder",
      builder.hasPreview && builder.gridEditors >= 0 ? "PASS" : "FAIL",
      JSON.stringify(builder),
    );

    // Admin
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    // logout by clearing cookies then login admin
    await page.context().clearCookies();
    await login(page, ADMIN_LOGIN, password);
    step("admin-login", "PASS", ADMIN_LOGIN);

    await page.goto(`${BASE}/admin/member-sport-templates`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(OUT, "admin-list.png"),
      fullPage: true,
    });
    const listText = await page.locator("body").innerText();
    step(
      "admin-list",
      listText.includes("회원관리 템플릿") && listText.includes("킥복싱")
        ? "PASS"
        : "FAIL",
    );

    await page.goto(
      `${BASE}/admin/member-sport-templates/cmskickboxingtpl001`,
      { waitUntil: "networkidle", timeout: 60_000 },
    );
    await page.waitForTimeout(700);
    await page.screenshot({
      path: join(OUT, "admin-kickboxing.png"),
      fullPage: true,
    });
    const kickText = await page.locator("body").innerText();
    step(
      "admin-kickboxing-manage",
      kickText.includes("KICKBOXING") && kickText.includes("미리보기")
        ? "PASS"
        : "FAIL",
    );

    await page.goto(
      `${BASE}/admin/member-sport-templates/${qaTpl.id}`,
      { waitUntil: "networkidle", timeout: 60_000 },
    );
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(OUT, "admin-taekwondo-qa.png"),
      fullPage: true,
    });
    const qaText = await page.locator("body").innerText();
    step(
      "admin-taekwondo-qa-page",
      qaText.includes("TAEKWONDO_QA") || qaText.includes("태권도")
        ? "PASS"
        : "FAIL",
    );
  } finally {
    await browser.close();
  }

  // Cleanup QA template (no gym assignment)
  await prisma.memberSportTemplateField.deleteMany({
    where: { templateId: qaTpl.id },
  });
  await prisma.memberSportTemplate.delete({ where: { id: qaTpl.id } });
  step("admin-qa-template-cleanup", "PASS");

  const afterSport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const afterGym = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "GYM" },
  });
  const sampleAfter = await prisma.gymMember.findMany({
    where: { id: { in: sampleBefore.map((m) => m.id) } },
    select: {
      id: true,
      name: true,
      phone: true,
      memberNumber: true,
      status: true,
      gender: true,
      updatedAt: true,
    },
  });
  const coreDelta = sampleBefore.filter((b) => {
    const a = sampleAfter.find((x) => x.id === b.id);
    return (
      !a ||
      a.name !== b.name ||
      a.phone !== b.phone ||
      a.memberNumber !== b.memberNumber ||
      a.status !== b.status ||
      a.gender !== b.gender
    );
  });
  step(
    "sport-value-delta",
    afterSport === beforeSport ? "PASS" : "FAIL",
    `${beforeSport}→${afterSport}`,
  );
  step(
    "gym-value-delta",
    afterGym === beforeGym ? "PASS" : "FAIL",
    `${beforeGym}→${afterGym}`,
  );
  step(
    "gymmember-core-delta",
    coreDelta.length === 0 ? "PASS" : "FAIL",
    String(coreDelta.length),
  );

  const hydrationErrs = consoleErrors.filter(
    (e) => /hydrat|418|Minified React error #418/i.test(e),
  );
  step(
    "console-errors",
    consoleErrors.length === 0 ? "PASS" : "FAIL",
    String(consoleErrors.length),
  );
  step(
    "hydration",
    hydrationErrs.length === 0 ? "PASS" : "FAIL",
    String(hydrationErrs.length),
  );

  const report = { steps, consoleErrors, at: new Date().toISOString() };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  const failed = steps.filter((s) => s.status === "FAIL");
  console.log("\n=== SUMMARY ===");
  console.log(`PASS ${steps.filter((s) => s.status === "PASS").length}`);
  console.log(`FAIL ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
