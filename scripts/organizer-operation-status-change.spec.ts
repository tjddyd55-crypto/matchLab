/**
 * Operation status change — active button + post-change sync.
 * Run: npx playwright test scripts/organizer-operation-status-change.spec.ts -c playwright.organizer-layout-audit.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const EVENT_ID =
  process.env.PHASE8_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const OPERATION_PATH = `/organizer/events/${EVENT_ID}/operation`;

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

async function selectCalledMatch(page: Page) {
  const detail = page.getByRole("region", { name: "선택 경기 상세" });
  const listButtons = page.locator("div.hidden.md\\:flex").getByRole("button");
  const count = await listButtons.count();

  for (let i = 0; i < count; i++) {
    await listButtons.nth(i).click();
    const readyBtn = detail.getByRole("button", {
      name: "경기준비",
      exact: true,
    });
    if ((await readyBtn.getAttribute("aria-pressed")) === "true") {
      return detail;
    }
  }
  return null;
}

test.describe("operation status change", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("status button activates one option after change", async ({ page }) => {
    const consoleErrors = attachConsoleCollector(page);
    await loginOrganizer(page);
    await page.goto(OPERATION_PATH, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const detail = await selectCalledMatch(page);
    if (!detail) {
      test.skip(true, "경기준비 상태 경기가 없어 스킵");
    }

    const statusSection = detail!
      .getByText("경기 상태 변경", { exact: true })
      .locator("..");
    const readyBtn = statusSection.getByRole("button", {
      name: "경기준비",
      exact: true,
    });
    const ongoingBtn = statusSection.getByRole("button", {
      name: "경기진행중",
      exact: true,
    });
    const waitingBtn = statusSection.getByRole("button", {
      name: "대기",
      exact: true,
    });

    await expect(readyBtn).toHaveAttribute("aria-pressed", "true");

    const actionResponse = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("/operation") &&
        res.status() < 500,
      { timeout: 20_000 },
    );
    await ongoingBtn.click();
    await actionResponse;

    await expect(ongoingBtn).toHaveAttribute("aria-pressed", "true", {
      timeout: 15_000,
    });
    await expect(readyBtn).toHaveAttribute("aria-pressed", "false");
    await expect(waitingBtn).toHaveAttribute("aria-pressed", "false");

    await expect(detail!.getByText("경기진행중").first()).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(
      detail!.getByRole("button", { name: "경기진행중", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    const hydration = consoleErrors.filter(
      (e) =>
        e.includes("hydration") ||
        e.includes("Hydration") ||
        e.includes("#418"),
    );
    expect(hydration).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
