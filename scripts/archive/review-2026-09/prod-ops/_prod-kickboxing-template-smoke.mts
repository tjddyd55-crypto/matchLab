/**
 * Production smoke without mutating members.
 * Attempts auth; if blocked, still verifies routes do not 500 when unauthenticated
 * and schema/deploy are healthy.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const OUT = join(process.cwd(), "test-results", "prod-kickboxing-template-smoke");
mkdirSync(OUT, { recursive: true });

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_APP = "d9575ee0-a2e2-46c2-9221-b16ea4b8df96";
const PROD_PG = "9133eb46-6e18-4596-a374-babb4311f75a";

function vars(service: string) {
  return JSON.parse(
    execSync(
      `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${service} --json`,
      { encoding: "utf8" },
    ).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
}

type Step = { name: string; status: "PASS" | "FAIL" | "N/A"; detail?: string };
const steps: Step[] = [];
function step(name: string, status: Step["status"], detail?: string) {
  steps.push({ name, status, detail });
  console.log(
    `${status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "➖"} ${name}${detail ? " — " + detail : ""}`,
  );
}

async function main() {
  const app = vars(PROD_APP);
  const pgVars = vars(PROD_PG);
  const BASE = String(
    app.NEXT_PUBLIC_APP_URL || "https://app-production-79ad.up.railway.app",
  ).replace(/\/$/, "");
  const password = String(app.DEMO_PASSWORD || "");
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamabiko/i.test(dbUrl)) throw new Error("REFUSING: not yamabiko");

  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }),
    ),
  });

  const tplSet = await prisma.gym.count({
    where: { memberSportTemplateId: { not: null } },
  });
  step("Existing Gym template auto-apply", tplSet === 0 ? "PASS" : "FAIL", `set=${tplSet}`);

  const sample = await prisma.gymMember.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      gender: true,
      memberNumber: true,
      status: true,
    },
  });
  step("Sample member readable", sample ? "PASS" : "FAIL", sample?.memberNumber);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let consoleErrors = 0;
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors += 1;
  });

  try {
    // Unauthenticated route wiring — must not 500
    for (const path of [
      "/gym/members",
      "/gym/member-custom-fields",
      "/gym/members/new",
    ]) {
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
      });
      const status = res?.status() ?? 0;
      const url = page.url();
      const ok =
        status < 500 &&
        (url.includes("/login") || status === 200 || status === 303 || status === 307);
      step(`Unauth ${path}`, ok ? "PASS" : "FAIL", `status=${status} url=${url.replace(BASE, "")}`);
    }

    // Auth attempt for theone (only production gym with members)
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page
      .locator('input[name="identifier"], input[name="loginId"]')
      .first()
      .fill("theone");
    await page.locator('input[name="password"]').first().fill(password);
    await page.getByRole("button", { name: /로그인/ }).click();
    await page.waitForTimeout(4000);
    const authed = !page.url().includes("/login");
    if (!authed) {
      const err = await page
        .locator("text=/비밀번호|실패|잘못|error|불가/i")
        .first()
        .textContent()
        .catch(() => null);
      step(
        "Gym login (theone + DEMO_PASSWORD)",
        "N/A",
        `blocked — ${err?.slice(0, 80) ?? "stayed on login"}`,
      );
      step("Member list authenticated", "N/A", "credentials unavailable");
      step("Member detail authenticated", "N/A", "credentials unavailable");
      step("Member edit A형", "N/A", "credentials unavailable");
      step("member-custom-fields authenticated", "N/A", "credentials unavailable");
      step("Kickboxing opt-in", "N/A", "no QA gym / credentials");
      step("New member create", "N/A", "skip production mutation");
      step("Custom field CRUD", "N/A", "skip production mutation");
      step("Partial update", "N/A", "skip production mutation");
    } else {
      step("Gym login", "PASS", "theone");
      const listRes = await page.goto(`${BASE}/gym/members`, {
        waitUntil: "networkidle",
      });
      await page.screenshot({ path: join(OUT, "list.png"), fullPage: true });
      step(
        "Member list authenticated",
        listRes?.ok() ? "PASS" : "FAIL",
        `status=${listRes?.status()}`,
      );
      if (sample) {
        const detailRes = await page.goto(`${BASE}/gym/members/${sample.id}`, {
          waitUntil: "networkidle",
        });
        await page.screenshot({ path: join(OUT, "detail.png"), fullPage: true });
        const nameOk = await page
          .getByText(sample.name)
          .first()
          .isVisible()
          .catch(() => false);
        step(
          "Member detail authenticated",
          detailRes?.ok() && nameOk ? "PASS" : "FAIL",
        );
        const editRes = await page.goto(
          `${BASE}/gym/members/${sample.id}/edit`,
          { waitUntil: "networkidle" },
        );
        await page.screenshot({ path: join(OUT, "edit.png"), fullPage: true });
        const aType = await page
          .getByRole("heading", { name: /기본 정보/ })
          .isVisible()
          .catch(() => false);
        step(
          "Member edit A형",
          editRes?.ok() && aType ? "PASS" : "FAIL",
          `aType=${aType}`,
        );
      }
      const settingsRes = await page.goto(`${BASE}/gym/member-custom-fields`, {
        waitUntil: "networkidle",
      });
      step(
        "member-custom-fields authenticated",
        settingsRes?.ok() ? "PASS" : "FAIL",
      );
      step("Kickboxing opt-in", "N/A", "do not mutate real gym");
      step("New member create", "N/A", "skip production mutation");
      step("Custom field CRUD", "N/A", "skip production mutation");
      step("Partial update", "N/A", "skip production mutation");
    }

    step(
      "Console errors",
      consoleErrors === 0 ? "PASS" : "FAIL",
      `count=${consoleErrors}`,
    );
  } finally {
    writeFileSync(join(OUT, "report.json"), JSON.stringify(steps, null, 2));
    await browser.close();
    await prisma.$disconnect();
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  console.log("\n==== SUMMARY ====");
  console.log(
    `PASS ${steps.filter((s) => s.status === "PASS").length} FAIL ${failed.length} N/A ${steps.filter((s) => s.status === "N/A").length}`,
  );
  if (failed.length) {
    console.error(failed);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
