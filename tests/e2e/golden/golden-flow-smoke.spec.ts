import { expect, test } from "@playwright/test";
import {
  hasGoldenFlowCredentials,
  loginAsOrganizer,
} from "../helpers/auth";
import { goldenContextExists, loadGoldenFlowContext } from "../helpers/golden-data";

const canRun =
  hasGoldenFlowCredentials() &&
  goldenContextExists() &&
  process.env.SKIP_GOLDEN_FLOW_E2E !== "1";

test.describe("Golden Flow smoke", () => {
  test.skip(!canRun, "DEMO_PASSWORD + seed:golden context required");

  test("신청 확인 → 계체 → 경기 결과 확정", async ({ page }) => {
    const ctx = loadGoldenFlowContext();

    await test.step("organizer login", async () => {
      await loginAsOrganizer(page, { loginId: ctx.organizerLoginId });
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("applications — approved fighters visible", async () => {
      await page.goto(`/organizer/events/${ctx.eventId}/applications`);
      await expect(
        page.getByRole("table").getByText(ctx.fighterRed.name),
      ).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.getByRole("table").getByText(ctx.fighterBlue.name),
      ).toBeVisible();
    });

    async function selectFighterOnCheckIn(name: string) {
      const listbox = page.getByRole("listbox", { name: "현장 계체 선수 목록" });
      await expect(listbox).toBeVisible({ timeout: 60_000 });
      await listbox.getByRole("option", { name: new RegExp(name) }).click();
    }

    function weighInPassButton() {
      return page.getByRole("button", { name: "계체 통과", exact: true });
    }

    await test.step("onsite — weigh-in pass visible", async () => {
      await page.goto(`/organizer/events/${ctx.eventId}/check-in`);
      const listbox = page.getByRole("listbox", { name: "현장 계체 선수 목록" });
      await expect(
        listbox.getByRole("option", {
          name: new RegExp(`${ctx.fighterRed.name}.*계체 통과`),
        }),
      ).toBeVisible({ timeout: 60_000 });
      await selectFighterOnCheckIn(ctx.fighterRed.name);
      await expect(weighInPassButton()).toBeDisabled();
      await expect(page.getByText("대진 현황")).toBeVisible();
    });

    await test.step("bracket/result — operation board ready", async () => {
      await page.goto(`/organizer/events/${ctx.eventId}/operation`);
      const matchRow = page
        .getByRole("option")
        .filter({ hasText: ctx.fighterRed.name });
      await expect(matchRow.first()).toBeVisible({ timeout: 60_000 });
      await matchRow.first().click();

      const detail = page.getByRole("region", { name: "선택 경기 상세" });
      await expect(detail.getByRole("heading", { name: "결과 입력" })).toBeVisible();
      await expect(
        detail.getByRole("button", {
          name: new RegExp(`홍코너.*${ctx.fighterRed.name}`),
        }),
      ).toBeVisible();
      await expect(detail.getByRole("button", { name: /^확정$/ })).toBeVisible();
      await expect(matchRow.first()).toContainText("결과 미입력");
    });
  });
});
