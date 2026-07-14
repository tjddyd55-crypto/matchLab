"use server";

import {
  actionFailure,
  type ActionResult,
} from "@/lib/action-result";

const RETIRED_MESSAGE =
  "결과 입력 링크(스태프)는 더 이상 사용되지 않습니다. 주심 또는 운영자 화면에서 결과를 처리해 주세요.";

/** @deprecated 스태프 결과 링크 기능 제거 — mutation 차단 */
export async function staffUpdateMatchStatusAction(
  ..._args: unknown[]
): Promise<ActionResult<{ ok: true }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}

/** @deprecated 스태프 결과 링크 기능 제거 — mutation 차단 */
export async function staffRecordMatchOutcomeDraftAction(
  ..._args: unknown[]
): Promise<ActionResult<{ ok: true }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}

/** @deprecated 스태프 결과 링크 기능 제거 — mutation 차단 */
export async function staffConfirmMatchResultsAction(
  ..._args: unknown[]
): Promise<ActionResult<{ ok: true }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}

/** @deprecated 스태프 결과 링크 기능 제거 — 접속 코드 해제 차단 */
export async function unlockStaffRecorderAccessAction(
  ..._args: unknown[]
): Promise<ActionResult<{ ok: true }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}
