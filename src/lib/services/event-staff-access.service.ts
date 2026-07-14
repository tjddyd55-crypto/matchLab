import "server-only";

import { AppError } from "@/lib/errors/app-error";
import type { StaffAccessLinkRow } from "@/lib/repositories/event-staff-access.repository";

export const RESULT_RECORDER_ROLE = "result_recorder";

export type ResolvedStaffRecorderLink = StaffAccessLinkRow & {
  eventTitle: string;
  publicSlug: string;
};

const RETIRED_MESSAGE =
  "결과 입력 링크(스태프)는 더 이상 사용되지 않습니다. 주심 또는 운영자 화면에서 결과를 처리해 주세요.";

/**
 * 스태프 결과 입력 링크 UI·발급은 제거되었습니다.
 * EventStaffAccessLink 테이블·변경 로그 FK용으로 타입만 유지합니다.
 * create / assert / unlock 은 모두 차단합니다. (데이터 삭제·migration 없음)
 */
export const eventStaffAccessService = {
  async assertRecorderLink(): Promise<ResolvedStaffRecorderLink> {
    throw new AppError("FORBIDDEN", RETIRED_MESSAGE);
  },

  async unlockRecorderWithAccessCode(): Promise<void> {
    throw new AppError("FORBIDDEN", RETIRED_MESSAGE);
  },

  async createRecorderLink(): Promise<{ token: string; urlPath: string }> {
    throw new AppError("FORBIDDEN", RETIRED_MESSAGE);
  },

  async revokeLink(): Promise<void> {
    throw new AppError("FORBIDDEN", RETIRED_MESSAGE);
  },
};
