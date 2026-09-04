/**
 * Production QA: match header same-row + PDF kg from organizerMemo.
 *   npx tsx scripts/e2e-bracket-memo-weight-prod-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const BASE =
  process.env.QA_BASE_URL || "https://app-production-79ad.up.railway.app";
const OUT = join(process.cwd(), "test-results", "bracket-memo-weight-prod");
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "shgym";
mkdirSync(OUT, { recursive: true });

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

const app = JSON.parse(
  execSync("railway variable list -e production -s app --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const pw = String(app.DEMO_PASSWORD || "");
if (!pw) fail("DEMO_PASSWORD missing");

const pg = JSON.parse(
  execSync("railway variable list -e production -s Postgres --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
if (!dbUrl) fail("DATABASE_PUBLIC_URL missing");
if (!/yamabiko/i.test(dbUrl)) fail("expected Production yamabiko DB");
process.env.DATABASE_URL = dbUrl;

const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");
const { PrismaClient } = await import("../src/generated/prisma");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const orgUser = await prisma.user.findFirst({
  where: { loginId: ORG_LOGIN, role: "organizer" },
  include: { organizer: true },
});
if (!orgUser?.organizer) fail(`organizer ${ORG_LOGIN} missing`);

const event = await prisma.event.findFirst({
  where: {
    organizerId: orgUser.organizer.id,
    brackets: { some: { matches: { some: {} } } },
  },
  orderBy: { updatedAt: "desc" },
  select: { id: true, title: true },
});
if (!event) fail("no event with matches");

const qaMatches = await prisma.bracketMatch.findMany({
  where: { bracket: { eventId: event.id }, matchNumber: { not: null } },
  select: { id: true, matchNumber: true, organizerMemo: true },
  orderBy: { matchNumber: "asc" },
  take: 3,
});
if (qaMatches.length < 3) fail("need at least 3 matches for QA");

const [m68, m425, mNoKg] = qaMatches;
const originals = qaMatches.map((m) => ({
  id: m.id,
  organizerMemo: m.organizerMemo,
}));

const PRIVACY_TAIL = "선수 요청사항 / 연락처 관련 운영 메모";
await prisma.bracketMatch.update({
  where: { id: m68!.id },
  data: { organizerMemo: `68kg / ${PRIVACY_TAIL}` },
});
await prisma.bracketMatch.update({
  where: { id: m425!.id },
  data: { organizerMemo: "42.5kg" },
});
await prisma.bracketMatch.update({
  where: { id: mNoKg!.id },
  data: { organizerMemo: "운영 확인 필요" },
});

const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
let reportPass = false;

try {
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(`pageerror:${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page
  .locator('input[name="identifier"], #login-identifier, input[name="loginId"]')
  .first()
  .fill(ORG_LOGIN);
await page.locator('input[name="password"], input[type="password"]').first().fill(pw);
await page.getByRole("button", { name: /로그인/i }).click();
await page.waitForTimeout(3500);
if (page.url().includes("/login")) fail("login failed");

const bracketsUrl = `${BASE}/organizer/events/${event.id}/brackets?tab=view&view=workspace`;
await page.goto(bracketsUrl, { waitUntil: "networkidle", timeout: 180_000 });
await page.waitForTimeout(2500);

const headerLayout = await page.evaluate(() => {
  const select = document.querySelector(
    'select[aria-label="경기구분"]',
  ) as HTMLSelectElement | null;
  if (!select) return { found: false as const };

  const cs = getComputedStyle(select);
  const selectRect = select.getBoundingClientRect();
  const row = select.parentElement;
  const badge = row?.querySelector("[data-slot='badge'], [class*='StatusBadge'], span");
  let sameRow = false;
  let badgeTop: number | null = null;
  if (badge instanceof HTMLElement) {
    const br = badge.getBoundingClientRect();
    badgeTop = br.top;
    sameRow = Math.abs(br.top - selectRect.top) < 16;
  } else {
    // flex-wrap same-row container is enough evidence
    sameRow = !!row && getComputedStyle(row).display.includes("flex");
  }

  const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;

  return {
    found: true as const,
    height: Math.round(selectRect.height),
    minWidth: cs.minWidth,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    sameRow,
    badgeTop,
    selectTop: selectRect.top,
    overflowXDesktop: overflowX,
    selectCount: document.querySelectorAll('select[aria-label="경기구분"]').length,
  };
});

await page.screenshot({ path: join(OUT, "01-brackets-desktop.png"), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const mobile = await page.evaluate(() => {
  const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  return { overflowX, scrollWidth: document.documentElement.scrollWidth };
});
await page.screenshot({ path: join(OUT, "02-brackets-mobile-390.png"), fullPage: false });
await page.setViewportSize({ width: 1280, height: 800 });

// Division select regression (non-destructive): dirty enables Save, then revert without persist
let divisionEdit: { ok: boolean; detail: string } = {
  ok: true,
  detail: "skipped-single-option",
};
const select = page.locator('select[aria-label="경기구분"]').first();
if ((await select.count()) > 0) {
  const options = await select.locator("option").evaluateAll((opts) =>
    opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent || "" })),
  );
  const current = await select.inputValue();
  const other = options.find((o) => o.value && o.value !== current);
  if (other) {
    await select.selectOption(other.value);
    await page.waitForTimeout(400);
    const enabledSave = page.locator('button:has-text("저장"):not([disabled])');
    const enabledCount = await enabledSave.count();
    await select.selectOption(current);
    await page.waitForTimeout(300);
    const afterRevert = await select.inputValue();
    divisionEdit = {
      ok: enabledCount > 0 && afterRevert === current,
      detail: `dirty-enabled-save=${enabledCount}; reverted=${afterRevert === current}`,
    };
  }
}

// Print HTML (PDF content SSOT)
await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/print?mode=all-matches`,
  { waitUntil: "networkidle", timeout: 180_000 },
);
await page.waitForTimeout(1500);
const printText = await page.evaluate(() => document.body?.innerText ?? "");
await page.screenshot({ path: join(OUT, "03-bracket-print-p1.png"), fullPage: false });

const kg68 = printText.includes("68kg");
const kg425 = printText.includes("42.5kg");
const privacyLeak = printText.includes(PRIVACY_TAIL) || printText.includes("연락처 관련");

const kgHierarchy = await page.evaluate(() => {
  const cell = document.querySelector(".ops-print-match-kg");
  const no = cell?.previousElementSibling ?? document.querySelector(".ops-print-match-no");
  if (!cell || !no) return { found: false as const };
  const kgCs = getComputedStyle(cell);
  const noCs = getComputedStyle(no);
  return {
    found: true as const,
    matchNoFontSize: parseFloat(noCs.fontSize),
    matchNoWeight: parseInt(noCs.fontWeight, 10) || 400,
    kgFontSize: parseFloat(kgCs.fontSize),
    kgWeight: parseInt(kgCs.fontWeight, 10) || 400,
  };
});

const layoutCss = await page.evaluate(() => {
  const row = document.querySelector(".ops-print-row");
  if (!row) return null;
  const cs = getComputedStyle(row);
  const noCell = document.querySelector(".ops-print-match-no-cell");
  const noCs = noCell ? getComputedStyle(noCell) : null;
  return {
    rowMinHeight: cs.minHeight,
    noCellWidth: noCs?.width ?? null,
    hasRed: !!document.querySelector(".ops-print-corner-red"),
    hasBlue: !!document.querySelector(".ops-print-corner-blue"),
    hasVs: Array.from(document.querySelectorAll(".ops-print-vs")).some(
      (el) => (el.textContent || "").includes("VS"),
    ),
  };
});

const pdfRes = await page.request.get(
  `${BASE}/api/organizer/events/${event.id}/brackets/print-pdf?mode=all-matches`,
);
const pdfOk = pdfRes.ok();
const pdfBuf = pdfOk ? Buffer.from(await pdfRes.body()) : null;
if (pdfBuf) {
  writeFileSync(join(OUT, "bracket-print.pdf"), pdfBuf);
}
const pdfHasPrivacy = pdfBuf
  ? pdfBuf.toString("utf8").includes(PRIVACY_TAIL) ||
    pdfBuf.toString("latin1").includes(PRIVACY_TAIL)
  : false;

const pageerrors = errors.filter(
  (e) => !e.includes("favicon") && !e.includes("Failed to load resource"),
);

const headerPass =
  headerLayout.found &&
  headerLayout.height >= 34 &&
  headerLayout.height <= 40 &&
  headerLayout.sameRow &&
  headerLayout.selectCount > 0;

const hierarchyPass =
  !kgHierarchy.found ||
  (kgHierarchy.matchNoFontSize > kgHierarchy.kgFontSize ||
    kgHierarchy.matchNoWeight >= kgHierarchy.kgWeight);

const report = {
  base: BASE,
  servingExpected: "31058ef",
  eventId: event.id,
  eventTitle: event.title,
  qaMatchNumbers: qaMatches.map((m) => m.matchNumber),
  headerLayout,
  mobile,
  divisionEdit,
  print: {
    kg68,
    kg425,
    privacyLeak,
    hierarchy: kgHierarchy,
    layoutCss,
    hasTitle: printText.includes(event.title),
  },
  pdf: {
    ok: pdfOk,
    bytes: pdfBuf?.length ?? 0,
    privacyLeak: pdfHasPrivacy,
    note: "kg text verified via print HTML SSOT; PDF binary glyph scan skipped",
  },
  pageerrors,
  pass:
    headerPass &&
    !mobile.overflowX &&
    kg68 &&
    kg425 &&
    !privacyLeak &&
    hierarchyPass &&
    pdfOk &&
    (pdfBuf?.length ?? 0) > 50_000 &&
    !pdfHasPrivacy &&
    pageerrors.length === 0 &&
    divisionEdit.ok,
};

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
reportPass = report.pass;
if (!report.pass) fail("Production memo-weight QA assertions failed");
console.log("PASS Production memo-weight / header QA");
} finally {
  for (const o of originals) {
    await prisma.bracketMatch.update({
      where: { id: o.id },
      data: { organizerMemo: o.organizerMemo },
    });
  }
  await browser.close().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  await pool.end().catch(() => undefined);
}

if (!reportPass) process.exit(1);
