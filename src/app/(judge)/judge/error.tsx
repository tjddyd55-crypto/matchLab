"use client";

import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** 심판 라우트 마지막 fallback — 서비스 레이어 graceful 처리 우선 */
export default function JudgeRouteError({ reset }: Props) {
  return (
    <CourtJudgeUnavailableState
      variant="invalid_court"
      roleLabel="심판"
      onRefresh={reset}
    />
  );
}
