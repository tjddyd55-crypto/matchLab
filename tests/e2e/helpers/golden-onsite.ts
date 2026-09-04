import { expect, type Page } from "@playwright/test";

/** 데스크톱 현장 계체 workspace (md+ list + detail split). */
export function checkInWorkspace(page: Page) {
  return page.getByTestId("checkin-workspace");
}

export async function gotoCheckIn(page: Page, eventId: string): Promise<void> {
  await page.goto(`/organizer/events/${eventId}/check-in`, {
    waitUntil: "domcontentloaded",
  });
  await expect(checkInWorkspace(page)).toBeVisible({ timeout: 60_000 });
}

export async function selectFighterOnCheckIn(
  page: Page,
  fighterName: string,
): Promise<void> {
  const workspace = checkInWorkspace(page);
  const listbox = workspace.getByRole("listbox", {
    name: "현장 계체 선수 목록",
  });
  await expect(listbox).toBeVisible({ timeout: 60_000 });
  const option = listbox.getByRole("option", {
    name: new RegExp(fighterName),
  });
  await expect(option).toBeVisible();
  await option.click();
  await expect(
    workspace.getByRole("heading", { name: new RegExp(fighterName) }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function assertFighterWeighInPendingInList(
  page: Page,
  fighterName: string,
): Promise<void> {
  const listbox = checkInWorkspace(page).getByRole("listbox", {
    name: "현장 계체 선수 목록",
  });
  await expect(
    listbox.getByRole("option", {
      name: new RegExp(`${fighterName}.*계체 대기`),
    }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function assertFighterWeighInPassedInList(
  page: Page,
  fighterName: string,
): Promise<void> {
  const listbox = checkInWorkspace(page).getByRole("listbox", {
    name: "현장 계체 선수 목록",
  });
  await expect(
    listbox.getByRole("option", {
      name: new RegExp(`${fighterName}.*계체 통과`),
    }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * 체중 저장 후 보드는 선택을 해제한다(onWeighInSaved).
 * 저장 완료는 상단 notice 또는 빈 detail 안내 문구로 확인한다.
 */
export async function saveWeighInWeight(
  page: Page,
  fighterName: string,
  weightKg: string,
): Promise<void> {
  const workspace = checkInWorkspace(page);
  const input = workspace.getByLabel("실제 계체 몸무게");
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await input.fill(weightKg);

  const saveBtn = workspace.getByRole("button", { name: /^저장$/ });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(
    page
      .getByRole("status")
      .filter({ hasText: new RegExp(`${fighterName}.*${weightKg}`) }),
  ).toBeVisible({ timeout: 30_000 });

  await expect(
    workspace.getByText("다음 선수를 검색하거나 목록에서 선택하세요."),
  ).toBeVisible({ timeout: 15_000 });
}

export async function clickWeighInPass(page: Page): Promise<void> {
  const workspace = checkInWorkspace(page);
  const passBtn = workspace.getByTestId("weighin-pass-button");
  await expect(passBtn).toBeVisible();
  await expect(passBtn).toBeEnabled({ timeout: 15_000 });
  await passBtn.click();
  await expect(passBtn).toBeDisabled({ timeout: 30_000 });
}

/**
 * 체중 저장 후 수동 계체 통과 mutation (browser Server Action).
 * overweight(예: 62kg)로 자동 통과를 피하고 버튼 클릭 경로를 검증한다.
 */
export async function mutateWeighInPassViaBrowser(
  page: Page,
  eventId: string,
  fighterName: string,
  weightKg: string,
): Promise<void> {
  await gotoCheckIn(page, eventId);
  await assertFighterWeighInPendingInList(page, fighterName);
  await selectFighterOnCheckIn(page, fighterName);
  await saveWeighInWeight(page, fighterName, weightKg);
  await selectFighterOnCheckIn(page, fighterName);
  await clickWeighInPass(page);
  await assertFighterWeighInPassedInList(page, fighterName);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(checkInWorkspace(page)).toBeVisible({ timeout: 60_000 });
  await assertFighterWeighInPassedInList(page, fighterName);
}
