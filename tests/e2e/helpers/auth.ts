import type { Page } from "@playwright/test";
import { GOLDEN_CI_ORGANIZER_LOGIN_ID } from "../../../src/lib/golden-flow/constants";

const GOLDEN_TEST_SESSION_PATH = "/api/internal/golden-flow/test-session";
const GOLDEN_TEST_SECRET_HEADER = "x-matchon-golden-test-auth-secret";

export function isGoldenCiTestAuthMode(): boolean {
  return (
    process.env.MATCHON_GOLDEN_TEST_AUTH === "1" &&
    process.env.GOLDEN_FLOW_CI === "1"
  );
}

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

async function bootstrapGoldenCiSession(
  page: Page,
  base: string,
): Promise<void> {
  const secret = process.env.MATCHON_GOLDEN_TEST_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "MATCHON_GOLDEN_TEST_AUTH_SECRET 환경 변수가 필요합니다 (CI golden test auth).",
    );
  }

  const res = await page.request.post(`${base}${GOLDEN_TEST_SESSION_PATH}`, {
    headers: { [GOLDEN_TEST_SECRET_HEADER]: secret },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `Golden CI test session bootstrap failed (${res.status()}): ${body}`,
    );
  }

  const payload = (await res.json()) as {
    ok?: boolean;
    data?: { redirectTo?: string };
  };
  const redirectTo = payload.data?.redirectTo ?? "/organizer";
  await page.goto(`${base}${redirectTo}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
}

export async function loginAsOrganizer(
  page: Page,
  opts?: { loginId?: string; baseUrl?: string },
): Promise<void> {
  const base = (opts?.baseUrl ?? process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );

  if (isGoldenCiTestAuthMode()) {
    await bootstrapGoldenCiSession(page, base);
    return;
  }

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
  if (isGoldenCiTestAuthMode()) {
    return Boolean(process.env.MATCHON_GOLDEN_TEST_AUTH_SECRET?.trim());
  }
  return Boolean(
    process.env.GOLDEN_PASSWORD?.trim() || process.env.DEMO_PASSWORD?.trim(),
  );
}

export { GOLDEN_CI_ORGANIZER_LOGIN_ID };
