/**
 * Preview QA — 외부 링크 전적 구조화 입력 + 브라우저 품질 확인
 *
 *   QA_BASE_URL=https://app-preview-member-gym-b.up.railway.app \
 *   npx tsx scripts/e2e-auto-match-record-grade-preview-qa.mts
 *
 * 전제: .tmp-qa-pass.txt 에 organizer 비밀번호 저장
 * 단위 테스트: npm run verify:athlete-record-structured, verify:auto-match-record-priority
 */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const BASE = (
  process.env.QA_BASE_URL ?? "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");

const PASS = readFileSync(".tmp-qa-pass.txt", "utf8").trim();
const OUT = join(process.cwd(), "test-results", "auto-match-record-grade-qa");
mkdirSync(OUT, { recursive: true });

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

function attachQuality(page: Page) {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/favicon|React DevTools/i.test(t)) return;
    consoleErrors.push(t);
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
}

async function loginOrganizer(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  try {
    const idBox = page.locator("#login-identifier, input[name='identifier']");
    if (await idBox.count()) await idBox.first().fill("organizer");
    else {
      await page.getByLabel("아이디").waitFor({ timeout: 10_000 });
      await page.getByLabel("아이디").fill("organizer");
    }
  } catch {
    await page.getByLabel(/아이디|ID/i).fill("organizer");
  }
  await page.locator("input[name='password'], input[type='password']").fill(PASS);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL(/organizer/, { timeout: 30_000 });
}

let passed = 0;
let failed = 0;

async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}: ${String(e)}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────
// 브라우저: organizer 로그인 + 기본 품질
// ────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
attachQuality(page);

try {
  await loginOrganizer(page);

  await check("organizer 로그인 성공", async () => {
    await page.waitForURL(/organizer/, { timeout: 20_000 });
  });

  await page.screenshot({ path: join(OUT, "01-organizer-home.png") });

  // 외부 링크 신청 페이지 존재 확인 (경로는 /organizer)
  await check("organizer 홈 렌더링", async () => {
    const h1 = page.locator("h1, [role='heading']").first();
    await h1.waitFor({ timeout: 15_000 });
    const text = await h1.textContent();
    assert.ok(text && text.length > 0, "heading 없음");
  });

  // 모바일(390px) overflow 확인
  await check("수평 오버플로우 없음 (390px)", async () => {
    const hasOverflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 4;
    });
    assert.ok(!hasOverflow, "수평 오버플로우 발생");
  });

  // console.error 검사
  await check("console.error = 0", async () => {
    const filtered = consoleErrors.filter(
      (e) => !/favicon|DevTools|hydration/i.test(e),
    );
    if (filtered.length > 0) {
      writeFileSync(join(OUT, "console-errors.txt"), filtered.join("\n"));
    }
    assert.equal(filtered.length, 0, `console.error:\n${filtered.slice(0, 3).join("\n")}`);
  });

  await check("pageerror = 0", async () => {
    assert.equal(pageErrors.length, 0, `pageerror:\n${pageErrors.slice(0, 3).join("\n")}`);
  });

} finally {
  await browser.close();
}

// ────────────────────────────────────────────────────
// 결과
// ────────────────────────────────────────────────────

const report = {
  timestamp: new Date().toISOString(),
  base: BASE,
  passed,
  failed,
  consoleErrors,
  pageErrors,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

console.log(`\n결과: ${passed}개 통과, ${failed}개 실패`);
console.log(`보고서: ${join(OUT, "report.json")}\n`);

if (failed > 0) process.exit(1);
