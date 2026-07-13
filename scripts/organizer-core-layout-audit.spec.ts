/**
 * Organizer core layout audit — 4 screens PC/mobile screenshots.
 * Run: npx playwright test scripts/organizer-core-layout-audit.spec.ts -c playwright.organizer-layout-audit.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EVENT_ID =
  process.env.PHASE8_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const OUT_DIR = path.join(
  process.cwd(),
  "test-results",
  "organizer-core-layout-audit",
);

const SCREENS = [
  { id: "01-events-list", path: "/organizer/events" },
  { id: "02-check-in", path: `/organizer/events/${EVENT_ID}/check-in` },
  {
    id: "03-brackets-view",
    path: `/organizer/events/${EVENT_ID}/brackets?tab=view`,
  },
  { id: "04-operation", path: `/organizer/events/${EVENT_ID}/operation` },
] as const;

async function loginOrganizer(page: Page) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("organizer");
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

function attachConsoleCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      text.includes("favicon") ||
      text.includes("Download the React DevTools") ||
      text.includes("manifest")
    ) {
      return;
    }
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow, "horizontal overflow").toBe(false);
}

for (const viewport of [
  { name: "pc", width: 1440, height: 900 },
  { name: "pc-1280", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test.describe(`${viewport.name} organizer layout`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      test(`${screen.id}`, async ({ page }) => {
        const outSubdir = viewport.name.startsWith("pc") ? "pc" : "mobile";
        fs.mkdirSync(path.join(OUT_DIR, outSubdir), { recursive: true });
        const consoleErrors = attachConsoleCollector(page);

        await loginOrganizer(page);
        const response = await page.goto(screen.path, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        expect(response?.status() ?? 0).toBeLessThan(500);

        const body = await page.locator("body").innerText();
        expect(body).not.toMatch(/Application error/i);

        await assertNoHorizontalOverflow(page);

        const fileName =
          viewport.name === "pc-1280"
            ? `${screen.id}-1280.png`
            : `${screen.id}.png`;

        await page.screenshot({
          path: path.join(OUT_DIR, outSubdir, fileName),
          fullPage: true,
        });

        const hydration = consoleErrors.filter(
          (e) =>
            e.includes("hydration") ||
            e.includes("Hydration") ||
            e.includes("#418") ||
            e.includes("did not match"),
        );
        expect(hydration, `hydration on ${screen.path}`).toEqual([]);
        expect(consoleErrors, `console on ${screen.path}`).toEqual([]);
      });
    }
  });
}

test.describe("dashboard padding regression", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("organizer events list keeps container padding", async ({ page }) => {
    await loginOrganizer(page);
    await page.goto("/organizer/events", {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const globalSidebar = page.locator("aside.bg-matchon-sidebar");
    const globalBox = await globalSidebar.boundingBox();
    const mainHeading = page.getByRole("heading").first();
    const headingBox = await mainHeading.boundingBox();

    expect(globalBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    if (!globalBox || !headingBox) return;

    const contentInset = headingBox.x - (globalBox.x + globalBox.width);
    expect(contentInset).toBeGreaterThanOrEqual(24);
  });
});
