import type { Page } from "@playwright/test";

function resolvePassword(): string {
  const password =
    process.env.GOLDEN_PASSWORD?.trim() ||
    process.env.DEMO_PASSWORD?.trim() ||
    "";
  if (!password) {
    throw new Error(
      "DEMO_PASSWORD 또는 GOLDEN_PASSWORD 환경 변수가 필요합니다.",
    );
  }
  return password;
}

export async function loginAsOrganizer(
  page: Page,
  opts?: { loginId?: string; baseUrl?: string },
): Promise<void> {
  const base = (opts?.baseUrl ?? process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
  const loginId =
    opts?.loginId ??
    process.env.GOLDEN_ORG_LOGIN?.trim() ??
    process.env.QA_ORG_LOGIN?.trim() ??
    "organizer";
  const password = resolvePassword();

  await page.goto(`${base}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .locator(
      'input[name="identifier"], #login-identifier, input[name="loginId"]',
    )
    .first()
    .fill(loginId);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 90_000,
  });
}

export async function loginAsGym(
  page: Page,
  opts?: { loginId?: string; baseUrl?: string },
): Promise<void> {
  const loginId =
    opts?.loginId ??
    process.env.GOLDEN_GYM_LOGIN?.trim() ??
    process.env.QA_GYM_LOGIN?.trim() ??
    "gym";
  await loginAsOrganizer(page, { ...opts, loginId });
}

export function hasGoldenFlowCredentials(): boolean {
  return Boolean(
    process.env.GOLDEN_PASSWORD?.trim() || process.env.DEMO_PASSWORD?.trim(),
  );
}
