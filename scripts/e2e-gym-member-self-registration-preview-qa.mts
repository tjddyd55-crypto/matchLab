/**
 * MATCHON 회원 셀프등록 Preview E2E QA
 * Development yamanote only. Production / yamabiko / main 변경 금지.
 *
 *   npx tsx scripts/e2e-gym-member-self-registration-preview-qa.mts
 *   npx tsx scripts/e2e-gym-member-self-registration-preview-qa.mts --cleanup-only
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { chromium, type BrowserContext, type Page } from "playwright";

const PREFIX = "MEMBER_SELF_REG_QA_";
const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const EXPECTED_SHA = "d2bd632dc3ec219ee8f0040d65b51d6b7b0a0c3e";
const OUT = join(process.cwd(), "test-results", "member-self-reg-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup-only");
const SIGNATURE_BUCKET =
  process.env.SUPABASE_CONSENT_SIGNATURE_BUCKET?.trim() || "consent-signatures";

mkdirSync(OUT, { recursive: true });

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
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

function railwayJson(env: string, service: string): Record<string, string> {
  const raw = execSync(`railway variable list -e ${env} -s ${service} --json`, {
    encoding: "utf8",
  }).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamanote(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamanote, got ${host || "unknown"}`);
  }
}

/** age.ts SSOT uses local calendar via toUtcDateOnly(getFullYear/Month/Date) */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addLocalYears(d: Date, years: number): Date {
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

function addLocalDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

type Report = Record<string, unknown>;

const report: Report = {
  ok: false,
  failReasons: [] as string[],
  flows: {} as Record<string, unknown>,
};

function fail(msg: string): never {
  (report.failReasons as string[]).push(msg);
  throw new Error(msg);
}
function pass(name: string, detail?: unknown) {
  (report.flows as Record<string, unknown>)[name] = detail ?? "PASS";
  console.log("PASS", name, detail ?? "");
}

const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const hydration: string[] = [];
const http5xx: string[] = [];
const nativeDialogs: string[] = [];

function attachQuality(page: Page) {
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") {
      if (/favicon|Download the React DevTools|third-party cookie/i.test(t)) return;
      consoleErrors.push(t.slice(0, 300));
    }
    if (/hydrat/i.test(t) || /#418/.test(t)) hydration.push(t.slice(0, 300));
  });
  page.on("pageerror", (e) => {
    pageErrors.push(e.message.slice(0, 300));
    if (/hydrat/i.test(e.message) || /#418/.test(e.message)) {
      hydration.push(e.message.slice(0, 300));
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      http5xx.push(`${res.status()} ${res.url()}`.slice(0, 300));
    }
  });
  page.on("dialog", (d) => {
    nativeDialogs.push(`${d.type()}:${d.message()}`.slice(0, 200));
    void d.dismiss();
  });
}

async function loginGym(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  if (await idBox.count()) {
    await idBox.first().fill(loginId);
  } else {
    await page.getByLabel("아이디").fill(loginId);
  }
  const pw = page.locator('input[name="password"]');
  if (await pw.count()) await pw.fill(password);
  else await page.getByLabel("비밀번호").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/gym/, { timeout: 90_000 });
}

async function drawSignature(page: Page, ariaLabel: string) {
  const canvas = page.locator(`canvas[aria-label="${ariaLabel}"]`);
  await canvas.waitFor({ timeout: 15_000 });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await canvas.boundingBox();
  if (!box) fail(`${ariaLabel} boundingBox missing`);
  await canvas.hover({ position: { x: 24, y: 28 } });
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 50, { steps: 12 });
  await page.mouse.move(box.x + 140, box.y + 24, { steps: 12 });
  await page.mouse.move(box.x + 60, box.y + 70, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  ) as Promise<number>;
}

async function confirmDanger(page: Page) {
  const title = page.getByRole("heading", {
    name: /할까요\?$/,
  });
  await title.waitFor({ timeout: 15_000 });
  const dialog = page.getByRole("dialog").filter({ has: title }).last();
  await dialog.getByRole("button", { name: "삭제" }).click();
}

async function fillBasic(
  page: Page,
  input: {
    name: string;
    gender: "남성" | "여성";
    birth: string;
    phone: string;
    address?: string;
    occupation?: string;
    guardianName?: string;
    guardianPhone?: string;
  },
) {
  await page.getByRole("textbox", { name: "이름 *", exact: true }).fill(input.name);
  await page.locator("button").filter({ hasText: new RegExp(`^${input.gender}$`) }).click();
  await page.getByRole("textbox", { name: "연락처 *", exact: true }).fill(input.phone);
  if (input.address) await page.getByLabel(/^주소$/).fill(input.address);
  if (input.occupation) await page.getByLabel("직업/학교").fill(input.occupation);
  await page.getByLabel("생년월일 *").fill(input.birth);
  if (input.guardianName) {
    await page.getByRole("textbox", { name: "보호자 이름 *", exact: true }).fill(
      input.guardianName,
    );
    await page.getByRole("textbox", { name: "보호자 연락처 *", exact: true }).fill(
      input.guardianPhone ?? "",
    );
  }
}

async function answerHealthAllNo(page: Page) {
  const nos = page.getByRole("button", { name: "아니오" });
  const n = await nos.count();
  if (n < 4) fail(`health 아니오 buttons ${n} < 4`);
  for (let i = 0; i < 4; i += 1) await nos.nth(i).click();
}

async function consentAndSign(
  page: Page,
  opts: { minor?: boolean; termsVersion?: number } = {},
) {
  await page.getByText("개인정보 수집·이용에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("이용 안내에 동의해 주세요.").waitFor({ timeout: 8_000 });
  await page.getByText("체육관 이용 안내에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("회원 서명을 입력해 주세요.").waitFor({ timeout: 8_000 });
  await page.getByRole("button", { name: "이용 안내 전문 보기" }).click();
  const pre = await page.locator("pre").innerText();
  if (opts.termsVersion && !pre.includes(`(v${opts.termsVersion})`)) {
    fail(`terms version ${opts.termsVersion} not shown: ${pre.slice(0, 120)}`);
  }
  await drawSignature(page, "회원 서명 패드");
  if (opts.minor) {
    await page.getByText("보호자로서 미성년자 이용에 동의합니다. (필수)").click();
    await drawSignature(page, "보호자 서명 패드");
  }
}

async function submitPublicFlow(
  page: Page,
  url: string,
  input: {
    name: string;
    gender: "남성" | "여성";
    birth: string;
    phone: string;
    address?: string;
    occupation?: string;
    guardianName?: string;
    guardianPhone?: string;
    purpose?: string;
    experience?: string;
    healthYes?: boolean;
    healthDetail?: string;
    termsVersion?: number;
    doubleClick?: boolean;
  },
) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByLabel("이름 *").waitFor({ timeout: 30_000 });
  await fillBasic(page, input);
  if (input.guardianName) {
    if (!(await page.getByText("미성년자 보호자 정보").isVisible())) {
      fail("minor guardian section missing");
    }
  } else if (await page.getByText("미성년자 보호자 정보").isVisible()) {
    fail("adult showed required guardian UI");
  }
  await page.getByRole("button", { name: "다음" }).click();

  if (input.purpose) await page.getByLabel("운동 목적").fill(input.purpose);
  if (input.experience) {
    await page.getByLabel("운동 경험 또는 경력").fill(input.experience);
  }
  if (input.healthYes) {
    const yes = page.getByRole("button", { name: "예" });
    await yes.nth(0).click();
    await yes.nth(1).click();
    await page.getByRole("button", { name: "다음" }).click();
    const needDetail = await page.getByText(/상세 내용을 입력해 주세요/).isVisible();
    if (!needDetail) fail("health YES without detail was allowed");
    const areas = page.locator("textarea");
    await areas.nth(1).fill(input.healthDetail ?? "MEMBER_SELF_REG_QA 건강 상세");
    await areas.nth(2).fill(input.healthDetail ?? "MEMBER_SELF_REG_QA 건강 상세");
    const nos = page.getByRole("button", { name: "아니오" });
    await nos.nth(2).click();
    await nos.nth(3).click();
  } else {
    await answerHealthAllNo(page);
  }
  await page.getByRole("button", { name: "다음" }).click();

  await consentAndSign(page, {
    minor: Boolean(input.guardianName),
    termsVersion: input.termsVersion,
  });
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByText(input.name, { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText(input.birth, { exact: false }).first().waitFor();
  const submit = page.getByRole("button", { name: /회원 등록 신청|신청 중/ });
  if (input.doubleClick) {
    await Promise.all([
      submit.click(),
      submit.click().catch(() => null),
    ]);
  } else {
    await submit.click();
  }
  const success = page.getByText("회원 등록 신청이 완료되었습니다");
  const errBox = page.locator("p.text-red-700");
  await Promise.race([
    success.waitFor({ timeout: 60_000 }),
    errBox.waitFor({ timeout: 60_000 }),
  ]).catch(async () => {
    await page.screenshot({
      path: join(OUT, `submit-timeout-${input.name}.png`),
      fullPage: true,
    });
    fail(`submit timeout: ${(await page.locator("body").innerText()).slice(0, 500)}`);
  });
  if (await errBox.isVisible()) {
    const err = (await errBox.innerText()).trim();
    await page.screenshot({
      path: join(OUT, `submit-error-${input.name}.png`),
      fullPage: true,
    });
    fail(`submit error: ${err}`);
  }
  await success.waitFor({ timeout: 5_000 });
  await page.getByText(/체육관에서 내용을 확인한 후/).waitFor();
}

async function piiStorage(page: Page) {
  return page.evaluate(`(() => {
    const dump = (store) => {
      const out = {};
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;
        out[k] = store.getItem(k) || "";
      }
      return out;
    };
    return { local: dump(localStorage), session: dump(sessionStorage) };
  })()`) as Promise<{ local: Record<string, string>; session: Record<string, string> }>;
}

function hasPii(store: Record<string, string>, needles: string[]) {
  const blob = JSON.stringify(store).toLowerCase();
  return needles.some((n) => n && blob.includes(n.toLowerCase()));
}

async function main() {
  const localSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  report.localSha = localSha;
  report.expectedSha = EXPECTED_SHA;
  report.branch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
  report.base = BASE;

  const devPg = railwayJson("development", "Postgres");
  const devApp = railwayJson("development", "app");
  const prodPg = railwayJson("production", "Postgres");
  const devDbUrl = String(devPg.DATABASE_PUBLIC_URL || "");
  const prodDbUrl = String(prodPg.DATABASE_PUBLIC_URL || "");
  assertYamanote(devDbUrl);
  if (!/yamabiko/i.test(prodDbUrl)) {
    fail("Production DB fingerprint is not yamabiko");
  }
  process.env.DATABASE_URL = devDbUrl;
  report.devDbFingerprint = "yamanote";
  report.prodDbFingerprint = "yamabiko";
  report.productionUntouched = true;

  let servingCommit = String(
    devApp.RAILWAY_GIT_COMMIT_SHA ||
      devApp.RAILWAY_GIT_COMMIT ||
      "",
  );
  try {
    const depRaw = execSync(
      "railway deployment list -e development -s app --json",
      { encoding: "utf8" },
    );
    report.railwayDeployments = JSON.parse(depRaw);
    const list = JSON.parse(depRaw) as Array<Record<string, unknown>>;
    const first = Array.isArray(list) ? list[0] : null;
    if (first) {
      servingCommit =
        String(first.meta?.commitHash ?? first.commitHash ?? servingCommit);
      report.deploymentId = first.id ?? first.deploymentId ?? null;
      report.deploymentStatus = first.status ?? null;
    }
  } catch (e) {
    report.railwayDeploymentListError = String(e).slice(0, 200);
  }
  report.servingCommit = servingCommit || "(unset)";
  if (servingCommit && !servingCommit.startsWith("d2bd632") && !localSha.startsWith("d2bd632")) {
    console.warn("WARN serving/local SHA is not d2bd632", servingCommit, localSha);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    String(devApp.NEXT_PUBLIC_SUPABASE_URL || "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    String(devApp.SUPABASE_SERVICE_ROLE_KEY || "");
  const password =
    process.env.PREVIEW_TEST_PASSWORD?.trim() ||
    process.env.DEMO_PASSWORD?.trim() ||
    String(devApp.DEMO_PASSWORD || "");
  if (!supabaseUrl || !serviceKey || password.length < 8) {
    fail("supabase/password incomplete");
  }

  const { PrismaClient, UserRole, GymStatus, GymMemberRegistrationRequestStatus } =
    await import("../src/generated/prisma/client");
  const { loginIdToAuthEmail, normalizeLoginId } = await import(
    "../src/lib/fighter-login"
  );
  const { isMinorBirthDate, getCompletedAgeYears } = await import(
    "../src/lib/gym-member-self-registration/age"
  );
  const { checkGymMemberSelfRegistrationRateLimit, resetGymMemberSelfRegistrationRateLimitForTests } =
    await import("../src/lib/gym-member-self-registration/rate-limit");

  const pool = new Pool({
    connectionString: devDbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now().toString(36);
  const loginA = normalizeLoginId(`qsra${stamp}`.slice(0, 20));
  const loginB = normalizeLoginId(`qsrb${stamp}`.slice(0, 20));
  const gymNameA = `${PREFIX}${stamp}`;
  const gymNameB = `${PREFIX}B_${stamp}`;
  const today = new Date();
  const adultBirth = "1990-01-01";
  const exactly19 = ymdLocal(addLocalYears(today, -19));
  const dayBefore19 = ymdLocal(addLocalDays(addLocalYears(today, -19), 1));
  const minorBirth = ymdLocal(addLocalYears(today, -16));
  const parseLocal = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1);
  };
  if (!isMinorBirthDate(parseLocal(minorBirth))) {
    fail(`minorBirth ${minorBirth} is not minor by SSOT`);
  }
  if (isMinorBirthDate(parseLocal(exactly19))) {
    fail(`exactly 19 ${exactly19} treated as minor`);
  }
  if (!isMinorBirthDate(parseLocal(dayBefore19))) {
    fail(`day before 19 ${dayBefore19} treated as adult`);
  }
  report.ageBoundary = {
    today: ymdLocal(today),
    exactly19,
    dayBefore19,
    minorBirth,
    exactly19Age: getCompletedAgeYears(parseLocal(exactly19)),
    dayBefore19Age: getCompletedAgeYears(parseLocal(dayBefore19)),
  };

  const phone = (n: number) => {
    const base = Number(String(Date.now()).slice(-7));
    return `0109${String(base + n).padStart(7, "0").slice(-7)}`;
  };
  const adultPhone = phone(1);
  const minorPhone = phone(2);
  const healthPhone = phone(3);
  const rejectPhone = phone(4);
  const tabletPhone = phone(5);
  const directPhone = phone(6);
  const guardianPhone = phone(7);

  const NAMES = {
    adult: `${PREFIX}ADULT`,
    minor: `${PREFIX}MINOR`,
    health: `${PREFIX}HEALTH`,
    reject: `${PREFIX}REJECT`,
    tablet: `${PREFIX}TABLET`,
    direct: `${PREFIX}DIRECT`,
  };

  let authA: string | null = null;
  let authB: string | null = null;
  let gymAId: string | null = null;
  let gymBId: string | null = null;

  async function cleanup() {
    const gyms = await prisma.gym.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true, ownerUserId: true },
    });
    const gymIds = gyms.map((g) => g.id);
    const ownerIds = gyms.map((g) => g.ownerUserId);
    if (gymIds.length) {
      const reqs = await prisma.gymMemberRegistrationRequest.findMany({
        where: { gymId: { in: gymIds } },
        select: { signaturePath: true, guardianSignaturePath: true },
      });
      const paths = reqs
        .flatMap((r) => [r.signaturePath, r.guardianSignaturePath])
        .filter((p): p is string => Boolean(p));
      if (paths.length) {
        await supabase.storage.from(SIGNATURE_BUCKET).remove(paths).catch(() => null);
      }
      await prisma.gymMemberRegistrationRequest.updateMany({
        where: { gymId: { in: gymIds } },
        data: { approvedGymMemberId: null },
      });
      await prisma.gymMemberPayment.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymReceivable.deleteMany({ where: { gymId: { in: gymIds } } }).catch(() => null);
      await prisma.gymPaymentRefund.deleteMany({ where: { gymId: { in: gymIds } } }).catch(() => null);
      await prisma.gymMemberSubscription.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberGroupAssignment.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberGroup.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMembershipPlan.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberImportBatch.deleteMany({ where: { gymId: { in: gymIds } } }).catch(() => null);
      await prisma.fighter.deleteMany({
        where: { OR: [{ currentGymId: { in: gymIds } }, { gymMember: { gymId: { in: gymIds } } }] },
      }).catch(() => null);
      await prisma.gymMember.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberRegistrationRequest.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberSelfRegistrationLink.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gymMemberRegistrationTerms.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.gym.deleteMany({ where: { id: { in: gymIds } } });
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { loginId: { startsWith: "qsra" } },
          { loginId: { startsWith: "qsrb" } },
          { name: { startsWith: PREFIX } },
          { id: { in: ownerIds } },
        ],
      },
      select: { id: true, authUserId: true },
    });
    for (const u of users) {
      if (u.authUserId) {
        await supabase.auth.admin.deleteUser(u.authUserId).catch(() => null);
      }
    }
    if (users.length) {
      await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    }
    const leftGyms = await prisma.gym.count({ where: { name: { startsWith: PREFIX } } });
    const leftReq = await prisma.gymMemberRegistrationRequest.count({
      where: { name: { startsWith: PREFIX } },
    });
    const leftMem = await prisma.gymMember.count({
      where: { name: { startsWith: PREFIX }, deletedAt: null },
    });
    report.cleanup = {
      gyms: gymIds.length,
      users: users.length,
      remainingPrefixGyms: leftGyms,
      remainingPrefixRequests: leftReq,
      remainingPrefixMembers: leftMem,
    };
    console.log("CLEANUP", report.cleanup);
  }

  try {
    await cleanup();
    if (cleanupOnly) {
      report.ok = true;
      return;
    }

    async function createGymUser(loginId: string, name: string) {
      const authEmail = loginIdToAuthEmail(loginId);
      const { data, error } = await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });
      if (error || !data.user?.id) fail(`auth create failed: ${error?.message ?? "no id"}`);
      const user = await prisma.user.create({
        data: {
          authUserId: data.user.id,
          loginId,
          email: authEmail,
          name: `${name} owner`,
          role: UserRole.gym,
        },
      });
      const gym = await prisma.gym.create({
        data: {
          name,
          ownerUserId: user.id,
          status: GymStatus.active,
        },
      });
      return { authUserId: data.user.id, userId: user.id, gymId: gym.id };
    }

    const a = await createGymUser(loginA, gymNameA);
    const b = await createGymUser(loginB, gymNameB);
    authA = a.authUserId;
    authB = b.authUserId;
    gymAId = a.gymId;
    gymBId = b.gymId;
    pass("qa-gym-created", { gymAId, gymBId, loginA, loginB });

    const devTables = await prisma.$queryRawUnsafe<Array<{ rel: string | null }>>(
      `SELECT to_regclass('public."GymMemberSelfRegistrationLink"')::text AS rel
       UNION ALL SELECT to_regclass('public."GymMemberRegistrationTerms"')::text
       UNION ALL SELECT to_regclass('public."GymMemberRegistrationRequest"')::text`,
    );
    if (devTables.some((r) => !r.rel)) fail("Development self-reg tables missing");
    pass("dev-migration", "applied");

    let prodMigration = "unknown";
    const prodPool = new Pool({
      connectionString: prodDbUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    try {
      const prodRows = await prodPool.query<{ rel: string | null }>(
        `SELECT to_regclass('public."GymMemberSelfRegistrationLink"')::text AS rel`,
      );
      prodMigration = prodRows.rows[0]?.rel ? "APPLIED" : "NOT APPLIED";
    } finally {
      await prodPool.end();
    }
    report.prodMigration = prodMigration;
    if (prodMigration !== "NOT APPLIED") {
      fail(`Production migration unexpectedly ${prodMigration}`);
    }
    pass("prod-migration", "NOT APPLIED");

    const browser = await chromium.launch({ headless: true });
    const adminCtx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: "ko-KR",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const publicCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ko-KR",
    });
    const gymBCtx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: "ko-KR",
    });
    const admin = await adminCtx.newPage();
    const pub = await publicCtx.newPage();
    const gymBPage = await gymBCtx.newPage();
    attachQuality(admin);
    attachQuality(pub);
    attachQuality(gymBPage);

    try {
      await loginGym(admin, loginA, password);
      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await admin.getByRole("button", { name: "셀프등록 링크" }).first().waitFor({
        timeout: 30_000,
      });
      await admin.getByRole("link", { name: /등록 요청/ }).first().waitFor();
      await admin.getByRole("link", { name: "신규 회원 등록" }).first().waitFor();
      await admin.getByRole("button", { name: "엑셀 회원 업로드" }).first().waitFor();
      await admin.getByRole("button", { name: "엑셀 다운로드" }).first().waitFor();
      pass("admin-members-actions");

      async function openSelfRegDialog() {
        const btn = admin.getByRole("button", { name: "셀프등록 링크" }).first();
        await btn.click();
        const dlg = admin.getByRole("dialog");
        try {
          await dlg.waitFor({ timeout: 15_000 });
        } catch {
          await btn.click({ force: true });
          await dlg.waitFor({ timeout: 20_000 });
        }
        await dlg.getByText(gymNameA).waitFor({ timeout: 20_000 });
        await dlg.getByRole("button", { name: "이용규정 관리" }).waitFor();
        const regenBtn = dlg.getByRole("button", { name: "링크 재발급" });
        await regenBtn.waitFor();
        for (let i = 0; i < 20; i += 1) {
          if (await regenBtn.isEnabled()) break;
          await admin.waitForTimeout(250);
        }
        return dlg;
      }
      const dlg = await openSelfRegDialog();
      await dlg.getByText(gymNameA).waitFor();
      await dlg.locator("svg").first().waitFor({ timeout: 20_000 });
      const displayedUrl = (await dlg.locator("p.break-all").innerText()).trim();
      if (!displayedUrl.includes("/gym-register/")) fail(`url not public form: ${displayedUrl}`);
      await dlg.getByRole("button", { name: "링크 복사" }).click();
      let copiedUrl = displayedUrl;
      try {
        copiedUrl = await admin.evaluate(() => navigator.clipboard.readText());
      } catch {
        copiedUrl = displayedUrl;
      }
      if (copiedUrl !== displayedUrl) fail(`QR/copy mismatch ${copiedUrl} vs ${displayedUrl}`);
      await dlg.getByRole("button", { name: "QR 크게 보기" }).waitFor();
      await dlg.getByRole("link", { name: "인쇄" }).waitFor();
      await dlg.getByRole("button", { name: "링크 재발급" }).waitFor();
      await dlg.getByRole("button", { name: "사용 중지" }).waitFor();
      const tokenMatch = displayedUrl.match(/\/gym-register\/([^/?#]+)/);
      if (!tokenMatch) fail("token missing from url");
      const publicToken = decodeURIComponent(tokenMatch[1]!);
      pass("link-dialog", { url: displayedUrl, qrEqualsCopy: true });
      report.publicUrl = displayedUrl;
      report.copiedUrl = copiedUrl;

      await admin.keyboard.press("Escape");

      await pub.goto(displayedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await pub.getByLabel("이름 *").waitFor({ timeout: 30_000 });
      const pubText = await pub.locator("body").innerText();
      if (!pubText.includes("MATCHON")) fail("public missing MATCHON");
      if (!pubText.includes(`${gymNameA} 회원 등록`)) fail("public missing gym title");
      const navBits = await pub.locator("a, button").allTextContents();
      const leakedNav = navBits.filter((t) =>
        /로그인|회원가입|대회 공고|회원관리/.test(t),
      );
      if (leakedNav.length) fail(`public layout has admin/nav: ${leakedNav.join(",")}`);
      pass("public-layout");

      await pub.goto(`${BASE}/gym-register/invalid`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await pub.getByText("현재 회원 등록을 받을 수 없습니다").waitFor();
      if (await pub.getByLabel("이름 *").count()) fail("invalid token still shows form");
      pass("invalid-token");

      const membersBeforeAdult = await prisma.gymMember.count({
        where: { gymId: gymAId!, deletedAt: null },
      });
      const reqBeforeAdult = await prisma.gymMemberRegistrationRequest.count({
        where: { gymId: gymAId! },
      });
      const subBefore = await prisma.gymMemberSubscription.count({ where: { gymId: gymAId! } });
      const payBefore = await prisma.gymMemberPayment.count({ where: { gymId: gymAId! } });
      const fighterBefore = await prisma.fighter.count({
        where: { OR: [{ currentGymId: gymAId! }, { gymMember: { gymId: gymAId! } }] },
      });

      await pub.setViewportSize({ width: 390, height: 844 });
      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.adult,
        gender: "남성",
        birth: adultBirth,
        phone: adultPhone,
        address: "QA 주소",
        occupation: "직업/학교 QA",
        purpose: "체력 향상",
        experience: "킥복싱 1년",
        termsVersion: 1,
      });
      pass("adult-submit");

      const adultReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: gymAId!, name: NAMES.adult },
        orderBy: { submittedAt: "desc" },
      });
      if (!adultReq) fail("adult request missing");
      if (adultReq.status !== GymMemberRegistrationRequestStatus.pending) {
        fail(`adult status ${adultReq.status}`);
      }
      const membersAfterSubmit = await prisma.gymMember.count({
        where: { gymId: gymAId!, deletedAt: null },
      });
      if (membersAfterSubmit !== membersBeforeAdult) fail("GymMember created on submit");
      if (adultReq.gymId !== gymAId) fail("gym tamper/ssot: request gymId mismatch");
      const consent = adultReq.consentSnapshot as Record<string, unknown>;
      if (adultReq.termsVersion !== 1) fail(`adult termsVersion ${adultReq.termsVersion}`);
      if (!consent.termsVersion || !consent.privacyAgreedAt) fail("consentSnapshot incomplete");
      if (!adultReq.clientSubmissionId) fail("clientSubmissionId missing");
      if (!adultReq.signaturePath.includes("gym-self-reg/")) {
        fail(`signature path unexpected: ${adultReq.signaturePath}`);
      }
      const formSnap = adultReq.formSnapshot as Record<string, unknown>;
      if (formSnap.experienceText !== "킥복싱 1년") fail("experience snapshot missing");
      pass("adult-db-pending", {
        requestId: adultReq.id,
        signaturePath: adultReq.signaturePath,
        clientSubmissionId: adultReq.clientSubmissionId,
      });

      const anonPublic = await fetch(
        `${supabaseUrl}/storage/v1/object/public/${SIGNATURE_BUCKET}/${adultReq.signaturePath}`,
      );
      if (anonPublic.ok) fail("signature publicly readable");
      pass("signature-anon-denied", { status: anonPublic.status });

      const sameIdCount = await prisma.gymMemberRegistrationRequest.count({
        where: {
          linkId: adultReq.linkId,
          clientSubmissionId: adultReq.clientSubmissionId,
        },
      });
      if (sameIdCount !== 1) fail(`idempotency rows ${sameIdCount}`);
      pass("idempotency-db", { clientSubmissionId: adultReq.clientSubmissionId });

      const linkRow = await prisma.gymMemberSelfRegistrationLink.findUnique({
        where: { gymId: gymAId! },
      });
      if (!linkRow?.tokenHash) fail("tokenHash missing");
      const linkKeys = Object.keys(linkRow);
      if (linkKeys.some((k) => /rawToken|tokenPlain|plainToken/i.test(k))) {
        fail("raw token column present");
      }
      pass("token-hash-only", { tokenHashPrefix: linkRow.tokenHash.slice(0, 8) });

      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await admin.getByRole("link", { name: /등록 요청\s*1/ }).first().waitFor({
        timeout: 20_000,
      });
      await admin.getByRole("link", { name: /등록 요청/ }).first().click();
      await admin.waitForURL(/\/gym\/members\/registrations/, { timeout: 30_000 });
      await admin.getByText(NAMES.adult).first().waitFor();
      const listText = await admin.locator("body").innerText();
      if (listText.includes("건강정보 확인 필요") && !listText.includes(NAMES.health)) {
        const adultRow = admin.locator("tr", { hasText: NAMES.adult });
        if (await adultRow.count()) {
          const rowText = await adultRow.first().innerText();
          if (rowText.includes("건강정보 확인 필요")) fail("adult no-health still badged");
        }
      }
      if (/MEMBER_SELF_REG_QA 건강/.test(listText)) fail("health detail leaked on list");
      pass("admin-list-adult");

      await admin.locator("a", { hasText: "보기" }).first().click();
      await admin.getByRole("heading", { name: /등록 신청서/ }).waitFor({
        timeout: 20_000,
      });
      for (const section of ["기본정보", "건강상태", "운동경력", "동의내역", "서명"]) {
        await admin.getByText(section, { exact: true }).first().waitFor();
      }
      await admin.getByRole("img", { name: "회원 서명" }).waitFor({ timeout: 20_000 });
      const detailText = await admin.locator("body").innerText();
      if (/등록기간|결제금액|Payment status|결제 상태/.test(detailText) && /회원이 확정/.test(detailText)) {
        fail("request detail shows membership/payment as member-confirmed");
      }
      pass("admin-detail-adult");

      await admin.getByRole("button", { name: "회원으로 등록" }).click();
      await admin.waitForURL(/\/gym\/members\/[^/]+$/, { timeout: 60_000 });
      const adultMember = await prisma.gymMember.findFirst({
        where: { gymId: gymAId!, name: NAMES.adult, deletedAt: null },
      });
      const adultReqAfter = await prisma.gymMemberRegistrationRequest.findUnique({
        where: { id: adultReq.id },
      });
      if (!adultMember) fail("GymMember not created after approve");
      if (adultReqAfter?.status !== GymMemberRegistrationRequestStatus.approved) {
        fail(`request not APPROVED: ${adultReqAfter?.status}`);
      }
      if (adultReqAfter.approvedGymMemberId !== adultMember.id) {
        fail("approvedGymMemberId mismatch");
      }
      if (adultMember.gender !== "남") fail(`gender ${adultMember.gender}`);
      if (!adultMember.memo?.includes("직업/학교 QA")) fail("occupation memo missing");
      if (!adultMember.memo?.includes("킥복싱 1년")) fail("experience memo missing");
      const adultJson = JSON.stringify(adultMember);
      if (/currentCondition|healthSnapshot|복용약/.test(adultJson)) {
        fail("health forced onto GymMember columns");
      }
      const subAfterAdult = await prisma.gymMemberSubscription.count({ where: { gymId: gymAId! } });
      const payAfterAdult = await prisma.gymMemberPayment.count({ where: { gymId: gymAId! } });
      const fighterAfterAdult = await prisma.fighter.count({
        where: { OR: [{ currentGymId: gymAId! }, { gymMember: { gymId: gymAId! } }] },
      });
      if (subAfterAdult !== subBefore) fail(`Membership delta ${subAfterAdult - subBefore}`);
      if (payAfterAdult !== payBefore) fail(`Payment delta ${payAfterAdult - payBefore}`);
      if (fighterAfterAdult !== fighterBefore) fail(`Fighter delta ${fighterAfterAdult - fighterBefore}`);
      pass("adult-approve", {
        memberId: adultMember.id,
        membershipDelta: 0,
        paymentDelta: 0,
        fighterDelta: 0,
      });

      await admin.getByRole("link", { name: "가입 신청서 보기" }).waitFor({
        timeout: 20_000,
      });
      await admin.getByRole("link", { name: "가입 신청서 보기" }).click();
      await admin.getByText("동의내역").first().waitFor();
      await admin.getByRole("img", { name: "회원 서명" }).first().waitFor();
      pass("registration-document-view");

      await admin.goto(`${BASE}/gym/members/${adultMember.id}?tab=membership`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByText(/회원권/).first().waitFor({ timeout: 20_000 });
      pass("membership-regression-panel");

      await admin.getByRole("heading", { name: "선수로 등록" }).waitFor({
        timeout: 20_000,
      });
      await admin.getByRole("button", { name: "선수 등록" }).waitFor();
      pass("fighter-extension-available");

      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.minor,
        gender: "여성",
        birth: minorBirth,
        phone: minorPhone,
        address: "QA 미성년 주소",
        guardianName: `${PREFIX}GUARD`,
        guardianPhone,
        purpose: "체력 향상",
        experience: "초보",
        termsVersion: 1,
      });
      const minorReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: gymAId!, name: NAMES.minor },
        orderBy: { submittedAt: "desc" },
      });
      if (!minorReq?.guardianName || !minorReq.guardianSignaturePath) {
        fail("minor guardian snapshot/signature missing");
      }
      if (minorReq.status !== GymMemberRegistrationRequestStatus.pending) {
        fail(`minor status ${minorReq.status}`);
      }
      pass("minor-submit", { requestId: minorReq.id });

      await admin.goto(`${BASE}/gym/members/registrations/${minorReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByRole("button", { name: "회원으로 등록" }).click();
      await admin.waitForURL(/\/gym\/members\/[^/]+$/, { timeout: 60_000 });
      const minorMember = await prisma.gymMember.findFirst({
        where: { gymId: gymAId!, name: NAMES.minor, deletedAt: null },
      });
      if (!minorMember?.guardianName) fail("guardian not mapped to GymMember");
      const subAfterMinor = await prisma.gymMemberSubscription.count({ where: { gymId: gymAId! } });
      const payAfterMinor = await prisma.gymMemberPayment.count({ where: { gymId: gymAId! } });
      const fighterAfterMinor = await prisma.fighter.count({
        where: { OR: [{ currentGymId: gymAId! }, { gymMember: { gymId: gymAId! } }] },
      });
      if (subAfterMinor !== subBefore || payAfterMinor !== payBefore || fighterAfterMinor !== fighterBefore) {
        fail("minor approve auto-created membership/payment/fighter");
      }
      pass("minor-approve", { memberId: minorMember.id, guardian: minorMember.guardianName });

      await pub.goto(displayedUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await pub.getByLabel("생년월일 *").fill(exactly19);
      await pub.waitForTimeout(300);
      if (await pub.getByText("미성년자 보호자 정보").isVisible()) {
        fail("exactly 19 showed guardian");
      }
      await pub.getByLabel("생년월일 *").fill(dayBefore19);
      await pub.waitForTimeout(300);
      if (!(await pub.getByText("미성년자 보호자 정보").isVisible())) {
        fail("day-before-19 missing guardian");
      }
      pass("age-boundary", { exactly19, dayBefore19 });

      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const termsDlg = await openSelfRegDialog();
      await termsDlg.getByRole("button", { name: "이용규정 관리" }).click();
      const titleInput = termsDlg.getByPlaceholder("제목");
      await titleInput.waitFor({ timeout: 10_000 });
      await titleInput.fill(`${PREFIX}TERMS_V2`);
      await termsDlg.locator("textarea").fill(`${PREFIX}TERMS_V2_CONTENT`);
      const saveTermsBtn = termsDlg.getByRole("button", { name: "저장 (버전 증가)" });
      await saveTermsBtn.click();
      let v2 = null as Awaited<
        ReturnType<typeof prisma.gymMemberRegistrationTerms.findFirst>
      >;
      for (let i = 0; i < 15; i += 1) {
        v2 = await prisma.gymMemberRegistrationTerms.findFirst({
          where: { gymId: gymAId!, version: 2 },
        });
        if (v2) break;
        await admin.waitForTimeout(500);
      }
      if (!v2) {
        const errText = await termsDlg.locator("p.text-red-700").innerText().catch(() => "");
        fail(`terms v2 not created ${errText}`);
      }
      await admin.keyboard.press("Escape");
      pass("terms-v2-created", { version: v2.version, title: v2.title });

      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.health,
        gender: "남성",
        birth: adultBirth,
        phone: healthPhone,
        healthYes: true,
        healthDetail: "MEMBER_SELF_REG_QA 건강 상세",
        termsVersion: 2,
      });
      const healthReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: gymAId!, name: NAMES.health },
      });
      if (!healthReq?.healthHasAnyYes) fail("healthHasAnyYes false");
      if (healthReq.termsVersion !== 2) fail(`health termsVersion ${healthReq.termsVersion}`);
      const adultStill = await prisma.gymMemberRegistrationRequest.findUnique({
        where: { id: adultReq.id },
      });
      if (adultStill?.termsVersion !== 1 || adultStill.termsTitle === `${PREFIX}TERMS_V2`) {
        fail("adult snapshot overwritten by v2");
      }
      pass("health-yes-submit", { requestId: healthReq.id, termsVersion: healthReq.termsVersion });

      await admin.goto(`${BASE}/gym/members/registrations?status=pending`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const healthRow = admin.locator("tr, a", { hasText: NAMES.health }).first();
      await healthRow.waitFor({ timeout: 20_000 });
      const pendingList = await admin.locator("body").innerText();
      if (!pendingList.includes("건강정보 확인 필요")) fail("health badge missing on list");
      if (pendingList.includes("MEMBER_SELF_REG_QA 건강 상세")) {
        fail("health detail leaked on list");
      }
      await admin.goto(`${BASE}/gym/members/registrations/${healthReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByText("MEMBER_SELF_REG_QA 건강 상세").first().waitFor({ timeout: 20_000 });
      pass("health-detail-privacy");

      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.adult,
        gender: "남성",
        birth: adultBirth,
        phone: adultPhone,
        address: "QA 주소",
      });
      const dupReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: {
          gymId: gymAId!,
          name: NAMES.adult,
          status: GymMemberRegistrationRequestStatus.pending,
        },
        orderBy: { submittedAt: "desc" },
      });
      if (!dupReq) fail("duplicate pending request missing");
      pass("duplicate-request-created", { requestId: dupReq.id });

      const membersBeforeDup = await prisma.gymMember.count({
        where: { gymId: gymAId!, deletedAt: null },
      });
      await admin.goto(`${BASE}/gym/members/registrations/${dupReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByText(/이미 등록된 회원|중복/).first().waitFor({ timeout: 20_000 });
      await admin.getByRole("button", { name: "회원으로 등록" }).click();
      await admin.getByText("비슷한 회원이 이미 등록되어 있습니다.").waitFor({
        timeout: 20_000,
      });
      const dupAfter = await prisma.gymMemberRegistrationRequest.findUnique({
        where: { id: dupReq.id },
      });
      const membersAfterDup = await prisma.gymMember.count({
        where: { gymId: gymAId!, deletedAt: null },
      });
      if (dupAfter?.status !== GymMemberRegistrationRequestStatus.pending) {
        fail(`duplicate was approved: ${dupAfter?.status}`);
      }
      if (membersAfterDup !== membersBeforeDup) fail("duplicate created GymMember");
      pass("duplicate-approve-blocked");

      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.reject,
        gender: "남성",
        birth: adultBirth,
        phone: rejectPhone,
      });
      const rejectReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: gymAId!, name: NAMES.reject },
      });
      if (!rejectReq) fail("reject request missing");
      await admin.goto(`${BASE}/gym/members/registrations/${rejectReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByRole("button", { name: "반려" }).click();
      await confirmDanger(admin);
      await admin.getByRole("heading", { name: "회원 등록 요청" }).waitFor({
        timeout: 30_000,
      });
      const rejected = await prisma.gymMemberRegistrationRequest.findUnique({
        where: { id: rejectReq.id },
      });
      if (rejected?.status !== GymMemberRegistrationRequestStatus.rejected) {
        fail(`reject status ${rejected?.status}`);
      }
      if (!rejected.formSnapshot || !rejected.signaturePath) fail("rejected snapshot lost");
      await admin.goto(`${BASE}/gym/members/registrations/${rejectReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByText("반려됨").first().waitFor();
      await admin.getByText("동의내역").first().waitFor();
      pass("reject-retained", { requestId: rejectReq.id });

      await pub.setViewportSize({ width: 768, height: 1024 });
      await submitPublicFlow(pub, displayedUrl, {
        name: NAMES.tablet,
        gender: "남성",
        birth: adultBirth,
        phone: tabletPhone,
        address: "태블릿 주소",
        doubleClick: true,
      });
      const tabletCount = await prisma.gymMemberRegistrationRequest.count({
        where: { gymId: gymAId!, name: NAMES.tablet },
      });
      if (tabletCount !== 1) fail(`double submit created ${tabletCount} rows`);
      pass("tablet-submit-idempotent-click", { count: tabletCount });

      await pub.getByRole("button", { name: "새 회원 등록" }).click();
      await pub.getByLabel("이름 *").waitFor();
      const nameVal = await pub.getByLabel("이름 *").inputValue();
      const phoneVal = await pub.getByLabel("연락처 *").inputValue();
      const birthVal = await pub.getByLabel("생년월일 *").inputValue();
      if (nameVal || phoneVal || birthVal) fail(`reset leaked PII name=${nameVal}`);
      pass("tablet-reset");

      await pub.goBack();
      await pub.waitForTimeout(800);
      const afterBack = await pub.locator("body").innerText();
      if (afterBack.includes(NAMES.tablet) && (await pub.getByLabel("이름 *").count()) && (await pub.getByLabel("이름 *").inputValue()) === NAMES.tablet) {
        fail("browser back restored tablet PII");
      }
      pass("browser-back-privacy");

      await pub.goto(displayedUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await pub.getByLabel("이름 *").fill(NAMES.tablet);
      await pub.reload({ waitUntil: "domcontentloaded" });
      const afterRefresh = await pub.getByLabel("이름 *").inputValue().catch(() => "");
      if (afterRefresh === NAMES.tablet) fail("refresh restored PII");
      const storage = await piiStorage(pub);
      if (hasPii(storage.local, [NAMES.tablet, tabletPhone, "킥복싱"]) || hasPii(storage.session, [NAMES.tablet, tabletPhone])) {
        fail(`storage leaked PII ${JSON.stringify(storage)}`);
      }
      if (pub.url().includes("name=") || pub.url().includes(tabletPhone)) {
        fail("PII in URL query");
      }
      pass("storage-refresh-privacy", storage);

      await pub.setViewportSize({ width: 390, height: 844 });
      await pub.goto(displayedUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await fillBasic(pub, {
        name: "스크롤QA",
        gender: "남성",
        birth: adultBirth,
        phone: phone(8),
      });
      await pub.getByRole("button", { name: "다음" }).click();
      await answerHealthAllNo(pub);
      await pub.getByRole("button", { name: "다음" }).click();
      await pub.getByText("개인정보 수집·이용에 동의합니다. (필수)").click();
      await pub.getByText("체육관 이용 안내에 동의합니다. (필수)").click();
      const canvas = pub.locator('canvas[aria-label="회원 서명 패드"]');
      await canvas.waitFor();
      await pub.evaluate("window.scrollTo(0, 0)");
      const scrollBefore = (await pub.evaluate("window.scrollY")) as number;
      await drawSignature(pub, "회원 서명 패드");
      const scrollAfterDraw = (await pub.evaluate("window.scrollY")) as number;
      if (Math.abs(scrollAfterDraw - scrollBefore) > 8) {
        fail(`canvas drag scrolled page ${scrollBefore} -> ${scrollAfterDraw}`);
      }
      const canScroll = (await pub.evaluate(
        "document.documentElement.scrollHeight > window.innerHeight + 40",
      )) as boolean;
      if (canScroll) {
        await pub.mouse.move(20, 700);
        await pub.mouse.down();
        await pub.mouse.move(20, 120, { steps: 12 });
        await pub.mouse.up();
        const outside = (await pub.evaluate("window.scrollY")) as number;
        if (outside <= 0) {
          report.signatureOutsideScroll = "page did not scroll outside canvas (soft)";
        } else {
          pass("signature-outside-scroll", { outside });
        }
      }
      pass("signature-scroll-lock", { scrollBefore, scrollAfterDraw });
      const ox390 = await overflowX(pub);
      if (ox390 > 1) fail(`390 overflowX=${ox390}`);
      pass("responsive-390", { overflowX: ox390 });

      for (const vp of [
        { w: 360, h: 800 },
        { w: 430, h: 932 },
      ] as const) {
        await pub.setViewportSize({ width: vp.w, height: vp.h });
        await pub.reload({ waitUntil: "domcontentloaded" });
        const ox = await overflowX(pub);
        if (ox > 1) fail(`${vp.w} overflowX=${ox}`);
        await pub.getByRole("button", { name: "다음" }).waitFor();
        pass(`responsive-${vp.w}`, { overflowX: ox });
      }

      await admin.goto(`${BASE}/self-registration-print`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const printText = await admin.locator("body").innerText();
      if (!printText.includes("MATCHON") || !printText.includes(gymNameA) || !printText.includes("신규 회원 등록")) {
        fail("print preview missing content");
      }
      await admin.locator("svg").first().waitFor();
      if (
        /출석 키오스크|그룹 관리|이용권 관리/.test(printText) ||
        (await admin.locator("aside").count()) > 0
      ) {
        fail("print includes admin chrome");
      }
      pass("print-preview");

      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const revokeDlg = await openSelfRegDialog();
      const oldUrl = displayedUrl;
      await revokeDlg.getByRole("button", { name: "사용 중지" }).click();
      await confirmDanger(admin);
      await revokeDlg.getByText("사용 중지").waitFor({ timeout: 20_000 });
      await admin.keyboard.press("Escape");
      await pub.goto(oldUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await pub.getByText("현재 회원 등록을 받을 수 없습니다").waitFor();
      const pendingStill = await prisma.gymMemberRegistrationRequest.count({
        where: { gymId: gymAId!, status: GymMemberRegistrationRequestStatus.pending },
      });
      if (pendingStill < 1) fail("revoke deleted pending requests");
      pass("revoke", { pendingStill });

      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const regenDlg = await openSelfRegDialog();
      await regenDlg.getByRole("button", { name: "링크 재발급" }).click();
      await confirmDanger(admin);
      await regenDlg.locator("p.break-all").waitFor({ timeout: 20_000 });
      const newUrl = (await regenDlg.locator("p.break-all").innerText()).trim();
      if (!newUrl.includes("/gym-register/") || newUrl === oldUrl) fail(`regen url invalid ${newUrl}`);
      await admin.keyboard.press("Escape");
      await pub.goto(oldUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await pub.getByText("현재 회원 등록을 받을 수 없습니다").waitFor();
      await pub.goto(newUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await pub.getByRole("heading", { name: /회원 등록/ }).waitFor({ timeout: 30_000 });
      const afterRegenPending = await prisma.gymMemberRegistrationRequest.count({
        where: { gymId: gymAId!, status: GymMemberRegistrationRequestStatus.pending },
      });
      if (afterRegenPending !== pendingStill) fail("regen affected pending count");
      pass("regenerate", { newUrl, oldInvalid: true });
      report.regeneratedUrl = newUrl;

      await loginGym(gymBPage, loginB, password);
      await gymBPage.goto(`${BASE}/gym/members/registrations/${adultReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const bText = await gymBPage.locator("body").innerText();
      if (bText.includes(NAMES.adult) && bText.includes("회원 서명")) {
        fail("gym B can read gym A request/signature");
      }
      pass("cross-gym-admin-denied");

      await admin.setViewportSize({ width: 1366, height: 768 });
      await admin.goto(`${BASE}/gym/members/new`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByLabel("이름 *").fill(NAMES.direct);
      await admin.getByLabel(/휴대전화번호/).fill(directPhone);
      await admin.getByRole("button", { name: "회원 등록" }).click();
      await admin.waitForURL(/\/gym\/members\/[^/]+$/, { timeout: 60_000 }).catch(async () => {
        await admin.screenshot({ path: join(OUT, "direct-member.png") });
      });
      const direct = await prisma.gymMember.findFirst({
        where: { gymId: gymAId!, name: NAMES.direct, deletedAt: null },
      });
      if (!direct) fail("direct member create failed");
      pass("direct-member-regression", { memberId: direct.id });

      await admin.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByRole("button", { name: /엑셀 회원 업로드/ }).first().click();
      await admin.getByRole("heading", { name: "엑셀 회원 업로드" }).waitFor({
        timeout: 15_000,
      });
      await admin.keyboard.press("Escape");
      pass("excel-regression");

      await admin.goto(`${BASE}/gym/attendance`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await admin.getByRole("heading", { name: "출석 관리" }).waitFor({ timeout: 20_000 });
      await admin.getByRole("link", { name: "출석 키오스크" }).waitFor();
      pass("attendance-regression");

      resetGymMemberSelfRegistrationRateLimitForTests();
      let limited = false;
      for (let i = 0; i < 25; i += 1) {
        const r = checkGymMemberSelfRegistrationRateLimit({
          tokenHashPrefix: linkRow.tokenHash.slice(0, 16),
          ip: "qa-preview",
        });
        if (!r.ok) {
          limited = true;
          break;
        }
      }
      if (!limited) fail("in-memory rate limit did not fire at 20/min");
      pass("rate-limit-in-memory", {
        note: "Preview replica=1 in-memory only; not Redis. Load not hammered on live submit endpoint to avoid orphan signatures.",
      });

      report.quality = {
        consoleErrors: consoleErrors.slice(0, 20),
        pageErrors: pageErrors.slice(0, 20),
        hydration: hydration.slice(0, 20),
        http5xx: http5xx.slice(0, 20),
        nativeDialogs,
      };
      if (consoleErrors.length) fail(`console.error ${consoleErrors.length}: ${consoleErrors[0]}`);
      if (pageErrors.length) fail(`pageerror ${pageErrors.length}: ${pageErrors[0]}`);
      if (hydration.length) fail(`hydration ${hydration.length}: ${hydration[0]}`);
      if (http5xx.length) fail(`5xx ${http5xx.length}: ${http5xx[0]}`);
      if (nativeDialogs.length) fail(`native dialog ${nativeDialogs[0]}`);
      pass("browser-quality-zero");
    } finally {
      await browser.close();
    }

    await cleanup();
    const left = report.cleanup as { remainingPrefixMembers: number; remainingPrefixRequests: number };
    if (left.remainingPrefixMembers !== 0 || left.remainingPrefixRequests !== 0) {
      fail(`cleanup leftover members=${left.remainingPrefixMembers} requests=${left.remainingPrefixRequests}`);
    }
    pass("cleanup-zero");

    report.ok = (report.failReasons as string[]).length === 0;
  } catch (e) {
    report.ok = false;
    (report.failReasons as string[]).push(String(e).slice(0, 500));
    console.error(e);
    try {
      await cleanup();
    } catch (cleanupErr) {
      report.cleanupError = String(cleanupErr).slice(0, 300);
    }
  } finally {
    await prisma.$disconnect().catch(() => null);
    await pool.end().catch(() => null);
    if (authA) await supabase.auth.admin.deleteUser(authA).catch(() => null);
    if (authB) await supabase.auth.admin.deleteUser(authB).catch(() => null);
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: report.ok, fails: report.failReasons }, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
