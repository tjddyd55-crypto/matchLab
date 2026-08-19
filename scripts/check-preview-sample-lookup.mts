import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

function railwayJson(service: string) {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "applicant-excel-sample-structure-qa");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const password = String(railwayJson("app").DEMO_PASSWORD || "123456!!");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByLabel("아이디").fill("organizer");
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
      timeout: 45_000,
    });
    await page.goto(`${BASE}/organizer/events`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.locator('a[href*="/organizer/events/"]').first().click();
    await page.waitForURL(/\/organizer\/events\//, { timeout: 30_000 });
    const eventId = page.url().match(/events\/([^/?#]+)/)?.[1];
    if (!eventId) throw new Error("eventId missing");
    await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
    ]);
    const path = join(OUT, "sample-after-lookup-fix.xlsx");
    await download.saveAs(path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const guide = wb.getWorksheet("입력 안내");
    if (!guide) throw new Error("guide missing");
    let title = "";
    let header = "";
    guide.eachRow((row) => {
      const vals = (row.values as unknown[])
        .slice(1)
        .map((v) => String(v ?? "").trim());
      if (vals[0]?.includes("사용 가능")) title = vals.join("|");
      if (vals[0] === "경기구분" && vals.includes("체중기준")) {
        header = vals.join(",");
      }
    });
    console.log(JSON.stringify({ title, header, path }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
