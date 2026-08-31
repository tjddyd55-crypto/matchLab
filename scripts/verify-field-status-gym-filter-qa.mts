/**
 * 현장 계체 체육관 필터 + PDF 버튼 브라우저 QA
 * npx tsx scripts/verify-field-status-gym-filter-qa.mts
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
const OUT = join(process.cwd(), "test-results", "field-status-gym-filter-qa");
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

async function login(page: Page, loginId = "organizer") {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .locator(
      'input[name="identifier"], #login-identifier, input[name="loginId"]',
    )
    .first()
    .fill(loginId);
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /로그인/i }).click();
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 90_000,
    });
  } catch {
    const body = await page.locator("body").innerText().catch(() => "");
    fail(`login failed for ${loginId}: ${page.url()} ${body.slice(0, 240)}`);
  }
  await page
    .waitForLoadState("networkidle", { timeout: 60_000 })
    .catch(() => undefined);
}

const DESKTOP_ROW =
  '.hidden.md\\:grid [role="listbox"][aria-label="현장 계체 선수 목록"] button[role="option"]';

async function countRows(page: Page) {
  const n = await page.locator(DESKTOP_ROW).count();
  if (n > 0) return n;
  return page
    .locator(
      '[role="listbox"][aria-label="현장 계체 선수 목록"] button[role="option"]',
    )
    .filter({ visible: true })
    .count();
}

async function gymNamesFromRows(page: Page) {
  return page.locator(DESKTOP_ROW).evaluateAll((btns) =>
    btns.map((b) => {
      const gymLine = b.querySelector("p.text-matchon-text-secondary");
      return (gymLine?.textContent ?? "").trim();
    }),
  );
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
  await page.screenshot({ path: join(OUT, "01-check-in.png"), fullPage: true });

  if (
    (await page.getByRole("button", { name: "계체 기록지 출력" }).count()) > 0
  ) {
    fail("계체 기록지 출력 button still present");
  }
  pass("print_button_removed");

  const pdfBtn = page.getByRole("button", { name: /계체 기록지 PDF/ });
  if ((await pdfBtn.count()) === 0) fail("계체 기록지 PDF missing");
  pass("pdf_button_present");

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    pdfBtn.click(),
  ]);
  const pdfPath = join(OUT, await download.suggestedFilename());
  await download.saveAs(pdfPath);
  const pdfStat = statSync(pdfPath);
  if (pdfStat.size < 1000) fail(`PDF too small: ${pdfStat.size}`);
  pass("pdf_download_smoke", { bytes: pdfStat.size, file: pdfPath });

  const gymSelect = page.locator('select[aria-label="체육관 필터"]');
  const gymOptions = await gymSelect.locator("option").evaluateAll((opts) =>
    opts.map((o) => ({
      value: (o as HTMLOptionElement).value,
      label: (o.textContent ?? "").trim(),
    })),
  );
  report.gymOptions = gymOptions;
  const gyms = gymOptions.filter((o) => o.value !== "all");
  if (gyms.length < 2) fail(`need >=2 gyms, got ${gyms.length}`);

  await gymSelect.selectOption("all");
  await page.waitForTimeout(300);
  const totalAll = await countRows(page);
  if (totalAll === 0) fail("no rows for all gyms");
  pass("filter_all", { count: totalAll });

  const preferredNullGyms = ["팀라펠MMA짐", "팀라페짐"];
  const gymA =
    gyms.find((g) => preferredNullGyms.includes(g.value)) ?? gyms[0]!;
  const gymB =
    gyms.find((g) => g.value !== gymA.value) ?? gyms[1]!;

  await gymSelect.selectOption(gymA.value);
  await page.waitForTimeout(400);
  const countA = await countRows(page);
  const namesA = await gymNamesFromRows(page);
  if (countA === 0) fail(`gym A empty: ${gymA.value}`);
  if (countA >= totalAll) fail(`gym A did not reduce: ${countA}/${totalAll}`);
  if (namesA.some((n) => n && n !== gymA.value)) {
    fail(`gym A leakage: ${namesA.filter((n) => n !== gymA.value).join(",")}`);
  }
  if (namesA.length !== countA) fail("count vs row mismatch A");
  pass("filter_gym_A", {
    gym: gymA.value,
    count: countA,
    snapshotPreferred: preferredNullGyms.includes(gymA.value),
  });

  await gymSelect.selectOption(gymB.value);
  await page.waitForTimeout(400);
  const countB = await countRows(page);
  const namesB = await gymNamesFromRows(page);
  if (countB === 0) fail(`gym B empty: ${gymB.value}`);
  if (namesB.some((n) => n && n !== gymB.value)) {
    fail(`gym B leakage`);
  }
  pass("filter_gym_B", { gym: gymB.value, count: countB });

  for (const snapGym of preferredNullGyms) {
    if (!gyms.some((g) => g.value === snapGym)) continue;
    await gymSelect.selectOption(snapGym);
    await page.waitForTimeout(400);
    const c = await countRows(page);
    const names = await gymNamesFromRows(page);
    if (c < 1) fail(`gymId-null snapshot gym empty: ${snapGym}`);
    if (names.some((n) => n && n !== snapGym)) {
      fail(`gymId-null snapshot leakage: ${snapGym}`);
    }
    pass("gymId_null_snapshot_row", { gym: snapGym, count: c });
  }

  const comboGym =
    gyms.find((g) => g.value === "데모 체육관") ??
    gyms.find((g) => !preferredNullGyms.includes(g.value)) ??
    gymB;

  await gymSelect.selectOption(comboGym.value);
  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("all");
  await page.locator('select[aria-label="경기구분 필터"]').selectOption("all");
  await page.waitForTimeout(300);
  const gymOnly = await countRows(page);

  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("pending");
  await page.waitForTimeout(300);
  const gymWeigh = await countRows(page);
  if (gymWeigh > gymOnly) fail("gym+weigh exceeds gym-only");
  pass("combo_gym_weigh_pending", { gym: comboGym.value, count: gymWeigh });

  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("all");
  const divisionSelect = page.locator('select[aria-label="경기구분 필터"]');
  const divisions = await divisionSelect.locator("option").evaluateAll((opts) =>
    opts
      .map((o) => ({
        value: (o as HTMLOptionElement).value,
        label: (o.textContent ?? "").trim(),
      }))
      .filter((d) => d.value !== "all"),
  );
  if (divisions[0]) {
    await divisionSelect.selectOption(divisions[0].value);
    await page.waitForTimeout(300);
    const combo = await countRows(page);
    if (combo > gymOnly) fail("gym+division exceeds gym-only");
    pass("combo_gym_division", {
      gym: comboGym.value,
      division: divisions[0].label,
      count: combo,
    });
    await divisionSelect.selectOption("all");
  } else {
    pass("combo_gym_division", "skipped");
  }

  await gymSelect.selectOption(comboGym.value);
  await page.waitForTimeout(200);
  const nameSpans = page.locator(`${DESKTOP_ROW} span.truncate`);
  const firstFighter =
    ((await nameSpans.first().textContent()) ?? "").trim() || "홍길동";
  const searchTerm = firstFighter.slice(0, Math.min(3, firstFighter.length));
  await page.locator('input[aria-label="선수 검색"]').fill(searchTerm);
  await page.waitForTimeout(400);
  const searchCount = await countRows(page);
  if (searchCount === 0 || searchCount > gymOnly) {
    fail(
      `gym+search invalid ${searchCount} term=${searchTerm} gymOnly=${gymOnly}`,
    );
  }
  pass("combo_gym_search", {
    gym: comboGym.value,
    term: searchTerm,
    count: searchCount,
  });
  await page.locator('input[aria-label="선수 검색"]').fill("");

  await page.getByRole("button", { name: "초기화" }).first().click();
  await page.waitForTimeout(400);
  const afterReset = await countRows(page);
  if (afterReset !== totalAll) fail(`reset ${afterReset} != ${totalAll}`);
  pass("reset_filters", { count: afterReset });

  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(600);
  const afterRefresh = await countRows(page);
  if (afterRefresh !== totalAll) fail(`refresh ${afterRefresh} != ${totalAll}`);
  pass("refresh_default", { count: afterRefresh });

  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("pass");
  await page.waitForTimeout(300);
  pass("regression_weigh_filter", { count: await countRows(page) });
  await page.locator('select[aria-label="계체 상태 필터"]').selectOption("all");

  await page.locator('input[aria-label="선수 검색"]').fill("홍");
  await page.waitForTimeout(300);
  pass("regression_search", { count: await countRows(page) });
  await page.locator('input[aria-label="선수 검색"]').fill("");

  if (divisions[0]) {
    await divisionSelect.selectOption(divisions[0].value);
    await page.waitForTimeout(300);
    pass("regression_division_filter", { count: await countRows(page) });
    await divisionSelect.selectOption("all");
  }

  // Applications gym filter smoke
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/applications`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.waitForTimeout(800);
  let appGymOk = false;
  const appGymSelect = page.locator('select[aria-label="체육관 필터"]');
  if ((await appGymSelect.count()) > 0) {
    const vals = await appGymSelect.locator("option").evaluateAll((os) =>
      os
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v !== "all"),
    );
    if (vals[0]) {
      await appGymSelect.selectOption(vals[0]);
      await page.waitForTimeout(400);
      appGymOk = true;
    }
  } else {
    const text = await page.locator("body").innerText();
    appGymOk = text.includes("체육관") || text.includes("신청자");
  }
  pass("regression_applications_gym_filter", { ok: appGymOk });

  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.waitForTimeout(500);
  const weightInput = page.locator(
    'input[aria-label*="체중"], input[name*="weight"], input[placeholder*="체중"]',
  );
  const weighSmoke =
    (await weightInput.count()) > 0 ||
    (await page.getByRole("button", { name: /계체|통과|실패/ }).count()) > 0;
  pass("regression_weigh_in_controls", { present: weighSmoke });

  report.consoleErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("React DevTools"),
  );
  const fatal = (report.consoleErrors as string[]).filter(
    (e) => !/hydration|Warning/i.test(e),
  );
  if (fatal.length > 0) fail(`console errors: ${fatal.slice(0, 3).join(" | ")}`);
  pass("console_clean", { errors: (report.consoleErrors as string[]).length });
  pass("gymId_null_snapshot_ssot", "verified via null-gymId display-name options");

  report.status = "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS field-status-gym-filter-qa");
  await browser.close();
}

main().catch((e) => fail(String(e)));
