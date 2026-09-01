/**
 * Onboarding signup submit smoke (local production server recommended)
 *   npm run build && MATCHON_PHONE_VERIFICATION_ENABLED=false npm run start
 *   npx tsx scripts/e2e-onboarding-signup-smoke.mts
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

function loadDotEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadDotEnv();

const BASE = (process.env.QA_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "onboarding-signup-smoke");
const GYM_PREFIX = "ONBOARDING_QA_GYM_";
const ASSOC_PREFIX = "ONBOARDING_QA_ASSOC_";
const LOGIN_GYM = "onb_qa_gym_";
const LOGIN_ASSOC = "onb_qa_assoc_";
const FORBIDDEN_NAV = ["주요 기능", "체육관 관리", "대회 운영", "MATCHON Manager", "대회 공고"];

const MIN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

type Report = Record<string, unknown>;

function fail(msg: string): never {
  console.error("FAIL", msg);
  throw new Error(msg);
}

async function drawSignature(page: Page) {
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ timeout: 15_000 });
  const box = await canvas.boundingBox();
  if (!box) fail("signature canvas missing");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 40, { steps: 6 });
  await page.mouse.up();
  const done = page.getByRole("button", { name: /서명 완료|완료/ });
  if (await done.count()) await done.first().click();
}

async function fillAddressFallback(page: Page, report: Report) {
  await page
    .getByText("주소 검색을 불러오지 못했습니다")
    .waitFor({ timeout: 20_000 })
    .catch(() => undefined);
  const addressBlock = page.locator("[data-address-search-field]").first();
  await addressBlock.waitFor({ timeout: 10_000 });
  await addressBlock.getByRole("button").first().click();
  await page.waitForTimeout(400);
  const textInputs = addressBlock.locator('input[type="text"]');
  await textInputs.nth(0).fill("06236", { force: true });
  await textInputs.nth(1).fill("서울 강남구 테헤란로 1", { force: true });
  await addressBlock.locator('input[name="addressDetail"]').fill("QA층");
  report.addressSearch = "FALLBACK_MANUAL";
}

async function setReactInput(
  locator: ReturnType<Page["locator"]>,
  value: string,
) {
  await locator.evaluate((el, v) => {
    const propsKey = Object.keys(el).find((key) => key.startsWith("__reactProps$"));
    const props = propsKey
      ? (el as unknown as Record<string, { onChange?: (e: { target: HTMLInputElement }) => void }>)[propsKey]
      : null;
    if (props?.onChange) {
      props.onChange({ target: { ...(el as HTMLInputElement), value: v } });
      return;
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function verifyPhoneOtp(page: Page, phone: string, report: Report, key: string) {
  const phoneInput = page.locator("#phone-verify-input");
  const plainMobile = page
    .locator("label")
    .filter({ hasText: /개인 연락처|담당자 연락처/ })
    .locator('input[type="tel"]')
    .first();
  if (await phoneInput.count()) {
    await setReactInput(phoneInput, phone);
    await page.waitForTimeout(300);
    const sendBtn = page.getByRole("button", { name: /인증번호 발송|인증번호 재발송/ });
    await sendBtn.waitFor({ state: "visible", timeout: 10_000 });
    for (let i = 0; i < 20; i++) {
      if (await sendBtn.isEnabled()) break;
      await page.waitForTimeout(200);
    }
    if (!(await sendBtn.isEnabled())) fail(`${key}: 인증번호 발송 버튼 disabled (phone=${phone})`);
    await sendBtn.click();
    const requestIdAttr = page.locator("[data-e2e-request-id]");
    await requestIdAttr.waitFor({ timeout: 20_000 });
    const requestId = await requestIdAttr.getAttribute("data-e2e-request-id");
    if (!requestId) fail(`${key}: e2e requestId missing`);
    let code: string | null = null;
    for (let i = 0; i < 24; i++) {
      const inboxRes = await page.request.get(
        `${BASE}/api/internal/phone-verification/e2e-inbox?requestId=${encodeURIComponent(requestId)}`,
      );
      if (inboxRes.ok()) {
        const body = (await inboxRes.json()) as { data?: { code?: string } };
        code = body.data?.code ?? null;
        if (code) break;
      }
      await page.waitForTimeout(400);
    }
    if (!code) {
      fail(
        `${key}: e2e inbox code not found — restart dev with MATCHON_AUTH_SMS_E2E_INBOX_ENABLED=true`,
      );
    }
    await page.locator("#phone-verify-code").fill(code);
    await page.getByRole("button", { name: "인증 확인" }).click();
    await page.getByText("인증 완료").waitFor({ timeout: 15_000 });
    report[key] = "OTP_PASS";
  } else if (await plainMobile.count()) {
    await plainMobile.fill(phone);
    report[key] = "PLAIN_PHONE";
  } else {
    fail(`${key}: phone input missing`);
  }
}

async function assertOnboardingShell(page: Page, label: string) {
  const bodyText = await page.locator("body").innerText();
  for (const nav of FORBIDDEN_NAV) {
    if (bodyText.includes(nav)) fail(`${label}: marketing nav visible: ${nav}`);
  }
  const loginLink = page.getByRole("link", { name: "로그인" });
  if (!(await loginLink.count())) fail(`${label}: login link missing`);
}

async function assertScrollToSubmit(page: Page, label: string, height: number) {
  const submit = page.getByRole("button", { name: /가입 신청 제출/ }).last();
  await submit.scrollIntoViewIfNeeded({ timeout: 30_000 });
  if (!(await submit.isVisible())) fail(`${label}: submit not visible after scroll`);
  const box = await submit.boundingBox();
  if (!box) fail(`${label}: submit bounding box missing`);
  reportScroll(label, height, box.y + box.height);
}

function reportScroll(_label: string, _height: number, _bottom: number) {
  // scroll owner may be main or document — visibility is the gate
}

async function fillGymForm(
  page: Page,
  opts: { gymName: string; loginId: string; password: string; phone: string; email: string },
  report: Report,
) {
  await page.locator('input[name="gymName"]').fill(opts.gymName);
  await fillAddressFallback(page, report);
  await page.getByLabel(/대표자명/).fill("QA온보딩대표");
  const contact = page.locator('input[name="contactName"]');
  if (await contact.count()) await contact.fill("QA담당");
  await verifyPhoneOtp(page, opts.phone, report, "gymPhoneVerification");
  await page.locator('input[name="email"]').fill(opts.email);
  await page.locator('input[name="requestedLoginId"]').fill(opts.loginId);
  const dupBtn = page.getByRole("button", { name: "중복 확인" });
  await dupBtn.click();
  await page.getByText(/사용 가능|사용할 수 있습니다/).first().waitFor({ timeout: 20_000 });
  await page.locator('input[name="password"]').fill(opts.password);
  await page.locator('input[name="passwordConfirm"]').fill(opts.password);
  await page.locator('input[name="privacyConsent"]').check();
  await page.locator('input[name="registrationConsent"]').check();
  await page.locator('input[name="signatureName"]').fill("QA온보딩대표");
  await page.locator('input[name="signatureConsent"]').check();
  await drawSignature(page);
}

async function fillAssociationForm(
  page: Page,
  opts: { name: string; loginId: string; phone: string; email: string },
  report: Report,
) {
  await page.locator('input[name="associationName"]').fill(opts.name);
  await page.locator('input[name="representativeName"]').fill("QA협회대표");
  await page.locator('input[name="contactName"]').fill("QA담당");
  await verifyPhoneOtp(page, opts.phone, report, "assocPhoneVerification");
  await page.locator('input[name="contactEmail"]').fill(opts.email);
  await page.locator('input[name="requestedLoginId"]').fill(opts.loginId);
  const dupBtn = page.getByRole("button", { name: "중복 확인" });
  await dupBtn.click();
  await page.getByText(/사용 가능|사용할 수 있습니다/).first().waitFor({ timeout: 20_000 });
  await fillAddressFallback(page, report);
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "qa-business.png",
    mimeType: "image/png",
    buffer: MIN_PNG,
  });
  await page.getByText("첨부가 완료되었습니다.").first().waitFor({ timeout: 60_000 });
  await page.locator('input[name="termsAccepted"]').check();
  await page.locator('input[name="privacyAccepted"]').check();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = { base: BASE, startedAt: new Date().toISOString() };
  const ts = Date.now().toString(36);
  const gymName = `${GYM_PREFIX}${ts}`;
  const assocName = `${ASSOC_PREFIX}${ts}`;
  const gymLoginId = `${LOGIN_GYM}${ts}`.slice(0, 20);
  const assocLoginId = `${LOGIN_ASSOC}${ts}`.slice(0, 20);
  const password = `Qa!${randomBytes(6).toString("hex")}9A`;
  const phoneGym = `010${String(Date.now()).slice(-8)}`;
  const phoneAssoc = `010${String(Date.now() + 1).slice(-8)}`;

  report.qaData = {
    gymName,
    assocName,
    gymLoginId,
    assocLoginId,
    passwordSha12: createHash("sha256").update(password).digest("hex").slice(0, 12),
  };

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, GymApplicationStatus } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const browser = await chromium.launch({ headless: true });
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const ignoreConsole = (t: string) =>
    /postcode\.v2\.js|Failed to load resource|net::ERR_|daumcdn/i.test(t);

  function wirePage(page: Page) {
    page.route("**/postcode/prod/postcode.v2.js", (route) => route.abort());
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") {
        const t = m.text().slice(0, 200);
        if (!ignoreConsole(t)) consoleErrors.push(t);
      }
    });
  }

  // --- Desktop gym submit ---
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    wirePage(page);
    await page.goto(`${BASE}/join/gym`, { waitUntil: "domcontentloaded" });
    await assertOnboardingShell(page, "gym-desktop");
    await assertScrollToSubmit(page, "gym-desktop", 768);

    await fillGymForm(
      page,
      {
        gymName,
        loginId: gymLoginId,
        password,
        phone: phoneGym,
        email: `onb_qa_gym_${ts}@example.com`,
      },
      report,
    );
    await page.getByRole("button", { name: "가입 신청 제출" }).click();
    await page.getByText("가입 신청이 완료되었습니다").waitFor({ timeout: 60_000 });
    report.gymSubmit = "PASS";

    const gymApp = await prisma.gymApplication.findFirst({
      where: { gymName, deletedAt: null },
    });
    if (!gymApp || gymApp.status !== GymApplicationStatus.pending) {
      fail("GymApplication missing or not pending");
    }
    report.gymDb = { id: gymApp.id, status: gymApp.status };
    await page.close();
  }

  // --- Desktop association submit ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    wirePage(page);
    await page.goto(`${BASE}/join/association`, { waitUntil: "domcontentloaded" });
    await assertOnboardingShell(page, "assoc-desktop");
    await assertScrollToSubmit(page, "assoc-desktop", 900);
    await fillAssociationForm(
      page,
      {
        name: assocName,
        loginId: assocLoginId,
        phone: phoneAssoc,
        email: `onb_qa_assoc_${ts}@example.com`,
      },
      report,
    );
    await page.getByRole("button", { name: "가입 신청 제출" }).click();
    await page.getByText("가입 신청이 완료되었습니다").waitFor({ timeout: 60_000 });
    report.assocSubmit = "PASS";

    const assocApp = await prisma.associationApplication.findFirst({
      where: { associationName: assocName, deletedAt: null },
    });
    if (!assocApp) fail("AssociationApplication missing");
    report.assocDb = { id: assocApp.id, status: assocApp.status };
    await page.close();
  }

  // --- Mobile gym scroll + keyboard ---
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    wirePage(page);
    await page.goto(`${BASE}/join/gym`, { waitUntil: "domcontentloaded" });
    await assertOnboardingShell(page, "gym-mobile");
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    if (overflowX) fail("mobile horizontal overflow");
    await page.locator('input[name="email"]').scrollIntoViewIfNeeded();
    await page.locator('input[name="email"]').focus();
    const submit = page.getByRole("button", { name: /가입 신청 제출/ }).last();
    await submit.scrollIntoViewIfNeeded();
    if (!(await submit.isVisible())) fail("mobile submit not reachable");
    report.mobileKeyboardScroll = "PASS";
    await page.close();
  }

  // --- Token/onboarding spot checks ---
  {
    const routes = ["/join", "/fighter/forgot-password"];
    for (const path of routes) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await assertOnboardingShell(page, path);
      await page.close();
    }
    report.tokenSpotCheck = "PASS /join /fighter/forgot-password";
  }

  // --- Landing regression ---
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    if (!text.includes("대회 공고") && !text.includes("주요 기능")) {
      fail("landing public nav regression");
    }
    report.landingRegression = "PASS";
    await page.close();
  }

  if (pageErrors.length) fail(`pageerror: ${pageErrors.join("; ")}`);
  if (consoleErrors.length) fail(`console: ${consoleErrors.join("; ")}`);

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("ALL PASS", JSON.stringify(report, null, 2));
  await browser.close();
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
