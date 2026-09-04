import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hasGoldenFlowCredentials, loginAsOrganizer } from "../helpers/auth";
import { goldenContextExists, loadGoldenFlowContext } from "../helpers/golden-data";
import {
  mutateWeighInPassViaBrowser,
} from "../helpers/golden-onsite";
import {
  mutateMatchResultViaBrowser,
} from "../helpers/golden-result";

const canRun =
  hasGoldenFlowCredentials() &&
  goldenContextExists() &&
  process.env.SKIP_GOLDEN_FLOW_E2E !== "1";

function assertGoldenDbReadOnly(phase: "weighin" | "result"): void {
  execSync(`npx tsx scripts/golden/assert-golden-browser-state.ts ${phase}`, {
    stdio: "inherit",
    env: process.env,
  });
}

test.describe("Golden Flow browser mutations", () => {
  test.skip(!canRun, "DEMO_PASSWORD + seed:golden context required");

  test("신청 → 계체 통과 → 결과 확정 (UI Server Action mutation)", async ({
    page,
  }) => {
    const ctx = loadGoldenFlowContext();
    const overWeightKg = "62";

    await test.step("organizer login", async () => {
      await loginAsOrganizer(page, { loginId: ctx.organizerLoginId });
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("GF-APPLICATION — approved fighters visible", async () => {
      await page.goto(`/organizer/events/${ctx.eventId}/applications`);
      await expect(
        page.getByRole("table").getByText(ctx.fighterRed.name),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("table").getByText(ctx.fighterBlue.name),
      ).toBeVisible();
    });

    await test.step("GF-WEIGHIN — red fighter browser mutation", async () => {
      await mutateWeighInPassViaBrowser(
        page,
        ctx.eventId,
        ctx.fighterRed.name,
        overWeightKg,
      );
    });

    await test.step("GF-WEIGHIN — blue fighter browser mutation", async () => {
      await mutateWeighInPassViaBrowser(
        page,
        ctx.eventId,
        ctx.fighterBlue.name,
        overWeightKg,
      );
    });

    await test.step("GF-WEIGHIN — DB read-only persistence", async () => {
      assertGoldenDbReadOnly("weighin");
    });

    await test.step("GF-BRACKET/RESULT — confirm winner via browser", async () => {
      await mutateMatchResultViaBrowser(
        page,
        ctx.eventId,
        ctx.fighterRed.name,
        "red",
      );
    });

    await test.step("GF-RESULT — DB read-only persistence", async () => {
      assertGoldenDbReadOnly("result");
    });
  });
});
