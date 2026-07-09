"use client";

import { useEffect } from "react";
import { CourtJudgeUnavailableState } from "@/components/domain/judges/CourtJudgeUnavailableState";
import {
  JUDGE_CLIENT_ERROR_MAX_MESSAGE,
  JUDGE_CLIENT_ERROR_MAX_STACK_HEAD,
  JUDGE_CLIENT_ERROR_MAX_STACK_LINES,
  JUDGE_CLIENT_ERROR_MAX_USER_AGENT,
  type JudgeClientErrorLogPayload,
} from "@/lib/judge-client-error-log";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

function buildJudgeRouteErrorPayload(error: Error & { digest?: string }): JudgeClientErrorLogPayload {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("target")?.trim() ?? null;

  return {
    scope: "judge-route-error",
    message: (error.message?.trim() || "Unknown error").slice(0, JUDGE_CLIENT_ERROR_MAX_MESSAGE),
    digest: error.digest?.trim() ? error.digest.trim().slice(0, 128) : null,
    stackHead:
      error.stack
        ?.split("\n")
        .slice(0, JUDGE_CLIENT_ERROR_MAX_STACK_LINES)
        .join("\n")
        .slice(0, JUDGE_CLIENT_ERROR_MAX_STACK_HEAD) ?? null,
    pathname: window.location.pathname,
    searchKeys: Array.from(params.keys()),
    hasEventId: params.has("eventId"),
    hasToken: params.has("token"),
    target: target === "score" || target === "head" ? target : null,
    userAgent: navigator.userAgent.slice(0, JUDGE_CLIENT_ERROR_MAX_USER_AGENT),
  };
}

/** 심판 라우트 클라이언트 렌더 예외 fallback */
export default function JudgeRouteError({ error, reset }: Props) {
  useEffect(() => {
    const payload = buildJudgeRouteErrorPayload(error);
    console.error("[judge-route-error]", payload, error);

    void fetch("/api/judge/client-error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // 로깅 실패는 사용자 흐름에 영향을 주지 않는다.
    });
  }, [error]);

  return (
    <CourtJudgeUnavailableState
      variant="client_error"
      roleLabel="심판"
      onRefresh={reset}
      refreshLabel="다시 시도"
    />
  );
}
