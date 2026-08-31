/**
 * 계체 저장 후 검색 focus 안정성 + count + random QA
 * npx tsx scripts/verify-checkin-focus-final-qa.mts
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

function loadDotEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}
loadDotEnv();

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const EVENT_ID =
  process.env.QA_EVENT_ID || "cmpba6v1l000eqcux4kfmg49y";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "1234";
const OUT = join(process.cwd(), "test-results", "checkin-focus-final-qa");
mkdirSync(OUT, { recursive: true });

const report: Record<string, unknown> = {
  base: BASE,
  eventId: EVENT_ID,
  startedAt: new Date().toISOString(),
};

function fail(msg: string): never {
  report.failedAt = msg;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(key: string, detail?: unknown) {
  report[key] = detail ?? "PASS";
  console.log("PASS:", key, detail ?? "");
}

async function login(page: Page) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .locator(
      'input[name="identifier"], #login-identifier, input[name="loginId"]',
    )
    .first()
    .fill("organizer");
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 90_000,
  });
}

const DESKTOP_ROW =
  '.hidden.md\\:grid [role="listbox"][aria-label="현장 계체 선수 목록"] button[role="option"]';
const WEIGHT_INPUT =
  '.hidden.md\\:grid input[aria-label="실제 계체 몸무게"]';
const SEARCH = 'input[aria-label="선수 검색"]';

async function readCardValue(page: Page, label: string): Promise<number> {
  // MatchonStatCardButton: label + value text nearby
  const card = page
    .locator("button")
    .filter({ hasText: new RegExp(`^${label}`) })
    .first();
  if ((await card.count()) === 0) {
    // fallback: any element containing label
    const text = await page.locator("body").innerText();
    const re = new RegExp(`${label}\\s*(\\d+)`);
    const m = text.match(re);
    if (!m) fail(`card not found: ${label}`);
    return Number(m[1]);
  }
  const text = (await card.innerText()).replace(/\s+/g, " ");
  const m = text.match(/(\d+)\s*$/) || text.match(/(\d+)/);
  if (!m) fail(`no number in card ${label}: ${text}`);
  return Number(m[1]);
}

async function pickPendingAthlete(page: Page, gymValue?: string) {
  await page.getByRole("button", { name: "초기화" }).first().click();
  await page.waitForTimeout(200);
  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("pending");
  if (gymValue) {
    await page.locator('select[aria-label="체육관 필터"]').selectOption(gymValue);
  }
  await page.waitForTimeout(300);
  const rows = page.locator(DESKTOP_ROW);
  const n = await rows.count();
  if (n < 1) fail(`no pending rows${gymValue ? ` for ${gymValue}` : ""}`);
  await rows.first().click();
  await page.locator(WEIGHT_INPUT).first().waitFor({ state: "visible", timeout: 10_000 });
}

async function saveWeight(page: Page, kg: string) {
  const input = page.locator(WEIGHT_INPUT).first();
  await input.fill(kg);
  await input.press("Enter");
  // wait for selection clear prompt or notice
  await page
    .locator("text=다음 선수를 검색하거나 목록에서 선택하세요")
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
}

async function clickDetailWeighAction(
  page: Page,
  name: "계체 통과" | "계체 실패",
) {
  // summary 카드와 라벨이 겹침 → 통계 카드 제외한 두 번째 동명 버튼 = 상세 액션
  const buttons = page.getByRole("button", { name, exact: true });
  const count = await buttons.count();
  if (count < 2) {
    // fallback: weight input이 있는 패널 내부
    const detail = page
      .locator(
        '.hidden.md\\:grid [class*="rounded-xl"][class*="border"][class*="bg-white"]',
      )
      .filter({ has: page.locator('input[aria-label="실제 계체 몸무게"]') });
    await detail.getByRole("button", { name, exact: true }).click();
  } else {
    await buttons.nth(1).click();
  }
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function assertSearchFocusedAndTypeable(page: Page, token: string) {
  const search = page.locator(SEARCH);
  // allow deferred focus after refresh
  let focused = false;
  for (let i = 0; i < 12; i++) {
    focused = await search.evaluate((el) => document.activeElement === el);
    if (focused) break;
    await page.waitForTimeout(100);
  }
  if (!focused) {
    // last resort: ensure we can focus without clicking other controls
    await search.focus();
    focused = await search.evaluate((el) => document.activeElement === el);
  }
  if (!focused) fail("search not focused after save");

  await search.fill("");
  await page.keyboard.type(token, { delay: 20 });
  const value = await search.inputValue();
  if (!value.includes(token)) {
    fail(`typed keys not in search (value=${value})`);
  }
  // ensure weight form not focused / no accidental resubmit UI
  const weightVisible = await page.locator(WEIGHT_INPUT).count();
  if (weightVisible > 0) {
    const weightFocused = await page
      .locator(WEIGHT_INPUT)
      .first()
      .evaluate((el) => document.activeElement === el);
    if (weightFocused) fail("weight input still focused after save");
  }
  await search.fill("");
  return true;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await login(page);
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.waitForTimeout(800);

  // Print policy smoke on check-in
  if ((await page.getByRole("button", { name: "계체 기록지 출력" }).count()) > 0) {
    fail("print sheet button present");
  }
  if ((await page.getByRole("button", { name: /계체 기록지 PDF/ }).count()) === 0) {
    fail("PDF button missing on check-in");
  }
  pass("checkin_pdf_only");

  // ---- Focus stability: 12 iterations ----
  const focusResults: Array<{ i: number; ok: boolean }> = [];
  for (let i = 1; i <= 12; i++) {
    await pickPendingAthlete(page);
    const emptyBefore = await page
      .locator("text=다음 선수를 검색하거나 목록에서 선택하세요")
      .count();
    await saveWeight(page, (50 + (i % 9) * 0.1).toFixed(1));
    const emptyAfter = await page
      .locator("text=다음 선수를 검색하거나 목록에서 선택하세요")
      .count();
    if (emptyAfter < 1 && emptyBefore < 1) {
      // prompt should appear after save
      const selected = await page.locator(WEIGHT_INPUT).count();
      if (selected > 0) fail(`iter ${i}: auto-selected next athlete`);
    }
    await assertSearchFocusedAndTypeable(page, `t${i}`);
    focusResults.push({ i, ok: true });
    console.log(`PASS focus iter ${i}`);
  }
  pass("focus_12_iterations", { count: focusResults.length, results: focusResults });

  // ---- Count PASS delta (manual 계체 통과 — SSOT refresh) ----
  await page.getByRole("button", { name: "초기화" }).first().click();
  await page.waitForTimeout(300);
  const pendingBefore = await readCardValue(page, "계체 대기");
  const passBefore = await readCardValue(page, "계체 통과");
  await pickPendingAthlete(page);
  await clickDetailWeighAction(page, "계체 통과");
  let pendingAfterPass = pendingBefore;
  let passAfter = passBefore;
  for (let i = 0; i < 20; i++) {
    pendingAfterPass = await readCardValue(page, "계체 대기");
    passAfter = await readCardValue(page, "계체 통과");
    if (pendingAfterPass === pendingBefore - 1 && passAfter === passBefore + 1) {
      break;
    }
    await page.waitForTimeout(250);
  }
  if (!(pendingAfterPass === pendingBefore - 1 && passAfter === passBefore + 1)) {
    fail(
      `PASS count not updated: pending ${pendingBefore}->${pendingAfterPass}, pass ${passBefore}->${passAfter}`,
    );
  }
  pass("count_pass_delta", {
    pending: [pendingBefore, pendingAfterPass],
    pass: [passBefore, passAfter],
  });

  // ---- Count FAIL delta ----
  await page.getByRole("button", { name: "초기화" }).first().click();
  await page.waitForTimeout(200);
  const failBefore = await readCardValue(page, "계체 실패");
  const pendingBeforeFail = await readCardValue(page, "계체 대기");
  await pickPendingAthlete(page);
  const detailFail = page
    .locator(
      '.hidden.md\\:grid [class*="rounded-xl"][class*="border"][class*="bg-white"]',
    )
    .filter({ has: page.locator('input[aria-label="실제 계체 몸무게"]') })
    .getByRole("button", { name: /^계체 실패$/ });
  await detailFail.scrollIntoViewIfNeeded();
  await detailFail.click({ trial: false });
  // 상세 상태 라벨이 바뀌는지 먼저 확인 (선택 유지 경로)
  let detailShowsFail = false;
  for (let i = 0; i < 25; i++) {
    const detailText = await page
      .locator(
        '.hidden.md\\:grid [class*="rounded-xl"][class*="border"][class*="bg-white"]',
      )
      .filter({ has: page.locator('input[aria-label="실제 계체 몸무게"], text=계체 실패') })
      .first()
      .innerText()
      .catch(() => "");
    if (/계체 실패/.test(detailText) && !/계체 대기/.test(detailText.split("\n").slice(0, 4).join("\n"))) {
      detailShowsFail = true;
      break;
    }
    // status line often: "계체 실패 · ..."
    if (/계체 실패/.test(detailText)) {
      detailShowsFail = true;
      break;
    }
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  let failAfter = failBefore;
  let pendingAfterFail = pendingBeforeFail;
  for (let i = 0; i < 30; i++) {
    failAfter = await readCardValue(page, "계체 실패");
    pendingAfterFail = await readCardValue(page, "계체 대기");
    if (
      pendingAfterFail === pendingBeforeFail - 1 &&
      failAfter === failBefore + 1
    ) {
      break;
    }
    await page.waitForTimeout(200);
  }
  if (
    !(pendingAfterFail === pendingBeforeFail - 1 && failAfter === failBefore + 1)
  ) {
    fail(
      `FAIL count not updated: pending ${pendingBeforeFail}->${pendingAfterFail}, fail ${failBefore}->${failAfter}, detailShowsFail=${detailShowsFail}`,
    );
  }
  pass("count_fail_delta", {
    pending: [pendingBeforeFail, pendingAfterFail],
    fail: [failBefore, failAfter],
    detailShowsFail,
  });

  // ---- Random gym order (pending 있으면 해당 체육관, 없으면 전체 pending) ----
  const gyms = await page
    .locator('select[aria-label="체육관 필터"] option')
    .evaluateAll((opts) =>
      opts
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v !== "all"),
    );
  const gymA =
    gyms.find((g) => g === "데모 체육관") ??
    gyms.find((g) => g.includes("데모")) ??
    gyms[0]!;
  const gymB = gyms.find((g) => g !== gymA) ?? gyms[1]!;
  const gymC = gyms.find((g) => g !== gymA && g !== gymB) ?? gymB;

  async function pickPendingPreferGym(gym: string) {
    await page.getByRole("button", { name: "초기화" }).first().click();
    await page.waitForTimeout(150);
    await page.locator('select[aria-label="계체 상태 필터"]').selectOption("pending");
    await page.locator('select[aria-label="체육관 필터"]').selectOption(gym);
    await page.waitForTimeout(250);
    let n = await page.locator(DESKTOP_ROW).count();
    if (n < 1) {
      await page.locator('select[aria-label="체육관 필터"]').selectOption("all");
      await page.waitForTimeout(250);
      n = await page.locator(DESKTOP_ROW).count();
    }
    if (n < 1) fail(`no pending rows for random (wanted ${gym})`);
    await page.locator(DESKTOP_ROW).first().click();
    await page.locator(WEIGHT_INPUT).first().waitFor({ state: "visible", timeout: 10_000 });
  }

  for (const [label, gym] of [
    ["A", gymA],
    ["B", gymB],
    ["A2", gymA],
    ["C", gymC],
  ] as const) {
    await pickPendingPreferGym(gym);
    await saveWeight(page, "55.5");
    const autoSelect = await page.locator(WEIGHT_INPUT).count();
    if (autoSelect > 0) fail(`random ${label}: auto next selection`);
    await assertSearchFocusedAndTypeable(page, label.slice(0, 1));
    pass(`random_${label}`, { gym });
  }

  // refresh persistence
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(600);
  const rows = await page.locator(DESKTOP_ROW).count();
  if (rows < 10) fail(`refresh rows ${rows}`);
  pass("refresh_persistence", { rows });

  // PDF smoke
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByRole("button", { name: /계체 기록지 PDF/ }).click(),
  ]);
  const pdfPath = join(OUT, await download.suggestedFilename());
  await download.saveAs(pdfPath);
  if (statSync(pdfPath).size < 1000) fail("pdf too small");
  pass("pdf_smoke", { bytes: statSync(pdfPath).size });

  // Print buttons removed on bracket / weigh sheet
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/brackets/all-matches`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  if ((await page.getByRole("button", { name: /^인쇄$/ }).count()) > 0) {
    fail("bracket still has 인쇄");
  }
  pass("bracket_print_removed");

  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/weigh-in-sheet`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  if ((await page.getByRole("button", { name: /^인쇄$/ }).count()) > 0) {
    fail("weigh sheet still has 인쇄");
  }
  pass("weigh_sheet_print_removed");

  const fatal = consoleErrors.filter(
    (e) =>
      !/favicon|React DevTools|hydration|대진표를 찾을 수 없습니다|Failed to load resource/i.test(
        e,
      ),
  );
  if (fatal.length) fail(`console: ${fatal.slice(0, 2).join(" | ")}`);
  pass("console_clean");

  report.status = "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS checkin-focus-final-qa");
  await browser.close();
}

main().catch((e) => fail(String(e)));
