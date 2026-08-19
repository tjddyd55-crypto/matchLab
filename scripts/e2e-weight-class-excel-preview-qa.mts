/**
 * Preview QA — Division Template weight-class Excel import
 *
 *   npx tsx scripts/e2e-weight-class-excel-preview-qa.mts
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const BASE = (
  process.env.QA_BASE_URL ??
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const PASS = readFileSync(".tmp-qa-pass.txt", "utf8").trim();
const OUT = join(process.cwd(), "test-results", "weight-class-excel-preview-qa");

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

function attachQuality(page: Page) {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/favicon|Download the React DevTools/i.test(t)) return;
    consoleErrors.push(t);
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
}

async function loginOrganizer(page: Page) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  if (await idBox.count()) await idBox.first().fill("organizer");
  else await page.getByLabel("아이디").fill("organizer");
  const pw = page.locator('input[name="password"]');
  if (await pw.count()) await pw.fill(PASS);
  else await page.getByLabel("비밀번호").fill(PASS);
  const submit = page.locator('button[type="submit"]');
  if (await submit.count()) await submit.first().click();
  else await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 90_000,
  });
}

async function openImportDialog(page: Page) {
  await page.goto(`${BASE}/organizer/division-templates/new`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.getByRole("heading", { name: "새 체급표 템플릿" }).waitFor({ timeout: 30_000 });
  await page.locator('input[placeholder="킥복싱"]').fill("킥복싱");
  await page.getByRole("button", { name: "엑셀 업로드" }).click();
  await page.getByRole("heading", { name: "체급표 Excel 일괄 등록" }).waitFor({
    timeout: 20_000,
  });
}

async function uploadInDialog(page: Page, filePath: string) {
  await page.getByRole("dialog").locator('input[type="file"]').setInputFiles(filePath);
}

async function waitPreviewTab(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/총 \d+개/).waitFor({ timeout: 60_000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown> = { base: BASE, flows: {} };
  const excel = await import("../src/lib/division-template/weight-class-excel.ts");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  attachQuality(page);

  try {
    await loginOrganizer(page);
    await openImportDialog(page);

    const samplePath = join(OUT, "MATCHON_체급표_업로드_샘플.xlsx");
    const wb = await excel.buildWeightClassSampleWorkbook({
      includeKickboxingFixture: true,
    });
    writeFileSync(samplePath, await excel.workbookToBuffer(wb));

    await uploadInDialog(page, samplePath);
    try {
      await waitPreviewTab(page);
    } catch (e) {
      const debugText = await page.locator('[role="dialog"]').innerText().catch(() => "");
      writeFileSync(join(OUT, "sample-upload-debug.txt"), debugText);
      await page.screenshot({ path: join(OUT, "sample-upload-debug.png"), fullPage: true });
      throw e;
    }
    const sampleText = await page.locator('[role="dialog"]').innerText();
    assert.match(sampleText, /총 66/);
    assert.match(sampleText, /오류[\s\S]*0|오류\s*\n\s*0/);
    assert.doesNotMatch(sampleText, /Cannot read properties/);
    report.flows = { ...report.flows as object, sampleUpload: "PASS" };
    console.log("PASS sample-upload-preview");

    await page.getByRole("button", { name: "다시 선택" }).click();
    await page.getByRole("heading", { name: "체급표 Excel 일괄 등록" }).waitFor();

    const boundaryPath = join(OUT, "weight-boundaries.xlsx");
    const boundaryWb = new ExcelJS.Workbook();
    const boundarySheet = boundaryWb.addWorksheet("체급표 입력");
    boundarySheet.addRow(["부문", "성별", "체급명", "체중", "기준", "정렬순서"]);
    boundarySheet.addRow(["고등부", "남성", "라이트웰터급", 63.5, "이하", 1]);
    boundarySheet.addRow(["대학·일반부", "남성", "슈퍼헤비급", 91, "초과", 2]);
    writeFileSync(boundaryPath, await workbookToBuffer(boundaryWb));

    await uploadInDialog(page, boundaryPath);
    await waitPreviewTab(page);
    const boundaryText = await page.locator('[role="dialog"]').innerText();
    assert.match(boundaryText, /-63\.5|63\.5/);
    assert.match(boundaryText, /\+91|91/);
    report.flows = { ...report.flows as object, boundaries: "PASS" };
    console.log("PASS boundaries -63.5 +91");

    await page.getByRole("button", { name: "다시 선택" }).click();
    const fakePath = join(OUT, "fake.xlsx");
    writeFileSync(fakePath, Buffer.from("not an xlsx file"));
    await uploadInDialog(page, fakePath);
    await page.getByText(/Excel 파일을 읽을 수 없습니다|지원하지 않는 파일/i).waitFor({
      timeout: 30_000,
    });
    const fakeText = await page.locator('[role="dialog"]').innerText();
    assert.doesNotMatch(fakeText, /Cannot read properties/);
    report.flows = { ...report.flows as object, invalidFile: "PASS" };
    console.log("PASS invalid-file-friendly-error");

    assert.equal(consoleErrors.length, 0, `console.error: ${consoleErrors.join(" | ")}`);
    assert.equal(pageErrors.length, 0, `pageerror: ${pageErrors.join(" | ")}`);
    report.quality = { consoleErrors: 0, pageErrors: 0, ok: true };
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("OK weight-class-excel-preview-qa");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
