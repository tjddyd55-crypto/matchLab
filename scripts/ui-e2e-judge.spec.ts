import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Manifest = {
  baseUrl: string;
  assignedMatchId: string;
  unassignedMatchId: string;
  password: string;
  judges: Record<
    string,
    { loginId: string; role: string; name: string; birthDate: string }
  >;
};

function loadManifest(): Manifest {
  return JSON.parse(
    readFileSync("/tmp/judge-ui-e2e-manifest.json", "utf8"),
  ) as Manifest;
}

async function judgeLogin(page: Page, loginId: string, password: string) {
  await page.goto("/judge/login");
  await page.getByLabel("심판 ID").fill(loginId);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/judge\/(verify|matches|review|results)/, {
    timeout: 30_000,
  });
}

async function confirmIdentity(
  page: Page,
  name: string,
  birthDate: string,
  afterPath: string,
) {
  if (!page.url().includes("/judge/verify")) {
    await page.goto("/judge/verify");
  }
  await page.getByLabel("성함").fill(name);
  await page.locator('input[name="birthDate"]').fill(birthDate);
  await page.getByRole("button", { name: /본인 확인 완료|정보 수정 후 계속/ }).click();
  await page.waitForURL(new RegExp(afterPath.replace(/\//g, "\\/")), {
    timeout: 60_000,
  });
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.waitForURL(/\/judge\/login/, { timeout: 30_000 });
}

async function fillRoundScores(page: Page, red: number, blue: number) {
  const fieldsets = page.locator("fieldset");
  const count = await fieldsets.count();
  for (let i = 0; i < count; i += 1) {
    const fs = fieldsets.nth(i);
    const inputs = fs.locator('input[type="number"]');
    await inputs.nth(0).fill(String(red));
    await inputs.nth(1).fill(String(blue));
  }
}

test.describe.configure({ mode: "serial" });

test.describe("PR #53 Judge UI E2E", () => {
  const m = loadManifest();

  test.use({ baseURL: m.baseUrl });

  test("smoke routes", async ({ page }) => {
    expect((await page.goto("/judge/login"))?.status()).toBe(200);
    await page.goto("/judge/profile");
    await expect(page).toHaveURL(/\/judge\/login/);
    await page.goto("/judge/verify");
    await expect(page).toHaveURL(/\/judge\/login/);
    await page.goto("/judge/matches");
    await expect(page).toHaveURL(/\/judge\/login/);
  });

  test("A identity gate and score submit", async ({ page }) => {
    await judgeLogin(page, m.judges.a.loginId, m.password);
    await expect(page).toHaveURL(/\/judge\/verify/);
    await page.goto("/judge/matches");
    await expect(page).toHaveURL(/\/judge\/verify/);
    await confirmIdentity(page, m.judges.a.name, m.judges.a.birthDate, "/judge/matches");
    await expect(page).toHaveURL(/\/judge\/matches/);

    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    await expect(page.getByText("채점 심판 (본인 확인)")).toBeVisible();
    await fillRoundScores(page, 10, 9);
    await page.getByRole("button", { name: "전송" }).click();
    await page.waitForURL(/\/judge\/matches/, { timeout: 60_000 });
    await logout(page);
  });

  test("B cannot see A scores", async ({ page }) => {
    await judgeLogin(page, m.judges.b.loginId, m.password);
    await confirmIdentity(page, m.judges.b.name, m.judges.b.birthDate, "/judge/matches");
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    const firstRed = page.locator("fieldset").first().locator('input[type="number"]').first();
    await expect(firstRed).toHaveValue("");
    await fillRoundScores(page, 9, 10);
    await page.getByRole("button", { name: "전송" }).click();
    await page.waitForURL(/\/judge\/matches/, { timeout: 60_000 });
    await logout(page);

    await judgeLogin(page, m.judges.a.loginId, m.password);
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    const aRed = page.locator("fieldset").first().locator('input[type="number"]').first();
    await expect(aRed).toHaveValue("10");
    await expect(aRed).not.toHaveValue("9");
    await logout(page);
  });

  test("C isolated scoring", async ({ page }) => {
    await judgeLogin(page, m.judges.c.loginId, m.password);
    await confirmIdentity(page, m.judges.c.name, m.judges.c.birthDate, "/judge/matches");
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    const firstRed = page.locator("fieldset").first().locator('input[type="number"]').first();
    await expect(firstRed).toHaveValue("");
    await fillRoundScores(page, 8, 8);
    await page.getByRole("button", { name: "전송" }).click();
    await page.waitForURL(/\/judge\/matches/, { timeout: 60_000 });
    await logout(page);
  });

  test("A revised resubmit", async ({ page }) => {
    await judgeLogin(page, m.judges.a.loginId, m.password);
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    await fillRoundScores(page, 10, 8);
    await page.getByRole("button", { name: "전송" }).click();
    await page.waitForURL(/\/judge\/matches/, { timeout: 60_000 });
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    const red = page.locator("fieldset").first().locator('input[type="number"]').first();
    await expect(red).toHaveValue("10");
    await logout(page);
  });

  test("HEAD_JUDGE review aggregation", async ({ page }) => {
    await judgeLogin(page, m.judges.head.loginId, m.password);
    await confirmIdentity(page, m.judges.head.name, m.judges.head.birthDate, "/judge/review");
    await expect(page).toHaveURL(/\/judge\/review/);
    await page.goto(`/judge/review/${m.assignedMatchId}`);
    await expect(page.getByRole("cell", { name: "심판 A" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "심판 B" })).toBeVisible();
    await expect(page.getByText(/제출:\s*3\/3/)).toBeVisible();
    await page.goto("/judge/matches");
    await expect(page).toHaveURL(/\/judge\/review/);
    await logout(page);
  });

  test("ANNOUNCER read-only results", async ({ page }) => {
    await judgeLogin(page, m.judges.ann.loginId, m.password);
    await confirmIdentity(page, m.judges.ann.name, m.judges.ann.birthDate, "/judge/results");
    await expect(page).toHaveURL(/\/judge\/results/);
    await expect(page.getByText("최종 확정 전 결과는 참고용입니다.")).toBeVisible();
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    await expect(page).not.toHaveURL(/\/score/);
    await logout(page);
  });

  test("unassigned match blocked", async ({ page }) => {
    await judgeLogin(page, m.judges.a.loginId, m.password);
    const res = await page.goto(`/judge/matches/${m.unassignedMatchId}/score`);
    expect(res?.status()).toBe(404);
    await page.goto("/judge/matches");
    await logout(page);
  });

  test("MatchResult locks scorecard edits", async ({ page }) => {
    execSync("npm run lock:judge-ui-e2e-match", {
      stdio: "inherit",
      env: process.env,
    });
    await judgeLogin(page, m.judges.a.loginId, m.password);
    await page.goto(`/judge/matches/${m.assignedMatchId}/score`);
    await expect(
      page.getByText("공식 결과가 확정되어 읽기 전용입니다."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "전송" })).toHaveCount(0);
    await logout(page);
  });

  test("public pages regression", async ({ request }) => {
    for (const path of [
      "/events",
      "/events/sample-open-2026",
      "/events/sample-open-2026/brackets",
      "/events/sample-open-2026/results",
      "/events/sample-open-2026/live",
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
  });
});
