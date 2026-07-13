/**
 * Figma rollout visual audit — screenshots + console/hydration checks.
 * Run: npx playwright test scripts/figma-visual-audit.spec.ts -c playwright.visual-audit.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const EVENT_ID =
  process.env.PHASE8_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const SLUG = process.env.PHASE8_EVENT_SLUG ?? "sample-open-2026";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const JUDGE_PASSWORD = process.env.JUDGE_UI_E2E_PASSWORD ?? "JudgeUiE2e6512!";
const OUT_DIR = path.join(process.cwd(), "test-results", "figma-visual-audit");

function loadJudgeManifest() {
  const candidates = [
    process.env.JUDGE_UI_E2E_MANIFEST_PATH,
    path.join(tmpdir(), "judge-ui-e2e-manifest.json"),
    path.join(process.cwd(), "judge-ui-e2e-manifest.json"),
  ].filter((p): p is string => Boolean(p));
  for (const manifestPath of candidates) {
    if (existsSync(manifestPath)) {
      return JSON.parse(readFileSync(manifestPath, "utf8")) as {
        assignedMatchId: string;
        judges: { a: { loginId: string; name: string; birthDate: string } };
      };
    }
  }
  return null;
}

const judgeManifest = loadJudgeManifest();
const JUDGE_MATCH_ID =
  process.env.JUDGE_UI_E2E_MATCH_ID ??
  judgeManifest?.assignedMatchId ??
  "cmqh62mh800160pqhsd74jrh6";

type Screen = {
  id: string;
  path: string;
  figmaNode?: string;
  login?: "organizer" | "gym" | "fighter" | "admin";
  judgeCourt?: boolean;
};

const SCREENS: Screen[] = [
  { id: "01-public-home", path: "/", figmaNode: "1:2" },
  { id: "02-public-events", path: "/events", figmaNode: "1:813" },
  { id: "03-public-event-detail", path: `/events/${SLUG}`, figmaNode: "1:1296" },
  { id: "04-organizer-home", path: "/organizer", figmaNode: "1:1560", login: "organizer" },
  {
    id: "05-organizer-applications",
    path: `/organizer/events/${EVENT_ID}/applications`,
    figmaNode: "1:1784",
    login: "organizer",
  },
  {
    id: "06-organizer-brackets",
    path: `/organizer/events/${EVENT_ID}/brackets`,
    figmaNode: "1:2312",
    login: "organizer",
  },
  {
    id: "07-organizer-operation",
    path: `/organizer/events/${EVENT_ID}/operation`,
    figmaNode: "1:2712",
    login: "organizer",
  },
  { id: "08-gym-events", path: "/gym/events", login: "gym" },
  { id: "09-fighter-home", path: "/fighter", login: "fighter" },
  { id: "10-admin-home", path: "/admin", login: "admin" },
  {
    id: "11-judge-score",
    path: `/judge/matches/${JUDGE_MATCH_ID}/score`,
    judgeCourt: true,
  },
];

async function judgeLogin(page: Page) {
  const judge = judgeManifest?.judges.a ?? {
    loginId: "ui-e2e-6512-a",
    name: "심판 A",
    birthDate: "1990-01-01",
  };
  await page.goto("/judge/login");
  await page.getByLabel("심판 ID").fill(judge.loginId);
  await page.getByLabel("비밀번호").fill(JUDGE_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/judge\/(verify|matches|review|results)/, {
    timeout: 45_000,
  });
  if (page.url().includes("/judge/verify")) {
    await page.getByLabel("성함").fill(judge.name);
    await page.locator('input[name="birthDate"]').fill(judge.birthDate);
    await page.getByRole("button", { name: /본인 확인 완료|정보 수정 후 계속/ }).click();
    await page.waitForURL(/\/judge\/matches/, { timeout: 60_000 });
  }
}

async function login(page: Page, role: Screen["login"]) {
  const ids = {
    organizer: "organizer",
    gym: "gym",
    fighter: "fighter",
    admin: "admin",
  } as const;
  await page.goto("/login");
  await page.getByLabel("아이디").fill(ids[role!]);
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

for (const viewport of [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test.describe(`${viewport.name} visual audit`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      test(`${screen.id} @ ${screen.path}`, async ({ page }) => {
        fs.mkdirSync(path.join(OUT_DIR, viewport.name), { recursive: true });
        const consoleErrors = attachConsoleCollector(page);

        if (screen.login) {
          await login(page, screen.login);
        }
        if (screen.judgeCourt) {
          await judgeLogin(page);
        }

        const response = await page.goto(screen.path, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        expect(response?.status() ?? 0).toBeLessThan(500);

        const body = await page.locator("body").innerText();
        expect(body).not.toMatch(/Application error/i);
        expect(body).not.toMatch(/Internal Server Error/i);

        await page.screenshot({
          path: path.join(OUT_DIR, viewport.name, `${screen.id}.png`),
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
