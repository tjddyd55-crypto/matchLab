import { expect, type Page } from "@playwright/test";

export function operationDetailPane(page: Page) {
  return page.getByTestId("operation-detail-pane");
}

export async function gotoOperation(page: Page, eventId: string): Promise<void> {
  await page.goto(`/organizer/events/${eventId}/operation`, {
    waitUntil: "domcontentloaded",
  });
  await expect(operationDetailPane(page)).toBeVisible({ timeout: 60_000 });
}

export async function selectMatchByFighter(
  page: Page,
  fighterName: string,
): Promise<void> {
  const listPane = page.getByTestId("operation-list-pane");
  const matchOption = listPane
    .getByRole("option")
    .filter({ hasText: fighterName });
  await expect(matchOption.first()).toBeVisible({ timeout: 60_000 });
  await matchOption.first().click();
  await expect(
    operationDetailPane(page).getByRole("heading", { name: "결과 입력" }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function assertMatchResultPending(
  page: Page,
  fighterName: string,
): Promise<void> {
  const listPane = page.getByTestId("operation-list-pane");
  const matchOption = listPane
    .getByRole("option")
    .filter({ hasText: fighterName });
  await expect(matchOption.first()).toContainText("결과 미입력");
}

export async function confirmMatchResultViaBrowser(
  page: Page,
  winnerCorner: "red" | "blue",
): Promise<void> {
  const detail = operationDetailPane(page);
  const winnerBtn = detail.getByTestId(`match-winner-${winnerCorner}`);
  await expect(winnerBtn).toBeVisible();
  await expect(winnerBtn).toBeEnabled();
  await winnerBtn.click();

  const confirmBtn = detail.getByTestId("match-result-confirm");
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  await expect(
    detail.getByText("경기 결과가 확정되었습니다."),
  ).toBeVisible({ timeout: 30_000 });
}

export async function assertMatchResultConfirmed(
  page: Page,
  fighterName: string,
): Promise<void> {
  const listPane = page.getByTestId("operation-list-pane");
  const matchOption = listPane
    .getByRole("option")
    .filter({ hasText: fighterName });
  await expect(matchOption.first()).not.toContainText("결과 미입력", {
    timeout: 30_000,
  });
}

/**
 * 경기 결과 확정 mutation + reload persistence.
 */
export async function mutateMatchResultViaBrowser(
  page: Page,
  eventId: string,
  fighterName: string,
  winnerCorner: "red" | "blue",
): Promise<void> {
  await gotoOperation(page, eventId);
  await assertMatchResultPending(page, fighterName);
  await selectMatchByFighter(page, fighterName);
  await confirmMatchResultViaBrowser(page, winnerCorner);
  await assertMatchResultConfirmed(page, fighterName);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(operationDetailPane(page)).toBeVisible({ timeout: 60_000 });
  await selectMatchByFighter(page, fighterName);
  await assertMatchResultConfirmed(page, fighterName);
  await expect(
    operationDetailPane(page).getByText("결과가 확정되었습니다"),
  ).toBeVisible({ timeout: 30_000 });
}
