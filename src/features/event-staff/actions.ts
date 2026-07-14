"use server";

import {
  actionFailure,
  type ActionResult,
} from "@/lib/action-result";

const RETIRED_MESSAGE =
  "결과 입력 링크(스태프)는 더 이상 사용되지 않습니다. 주심 또는 운영자 화면에서 결과를 처리해 주세요.";

/** @deprecated 스태프 결과 링크 기능 제거 — 신규 발급 불가 */
export async function createStaffRecorderLinkAction(
  ..._args: unknown[]
): Promise<ActionResult<{ token: string; urlPath: string }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}

/** @deprecated 스태프 결과 링크 기능 제거 — 폐기 불가(이미 UI 제거) */
export async function revokeStaffRecorderLinkAction(
  ..._args: unknown[]
): Promise<ActionResult<{ ok: true }>> {
  void _args;
  return actionFailure("FORBIDDEN", RETIRED_MESSAGE);
}
