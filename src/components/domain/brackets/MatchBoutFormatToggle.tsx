"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMatchBoutSettingsAction } from "@/features/matches/actions";
import { BracketType } from "@/lib/enums";
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";

export function MatchBoutFormatToggle({
  matchId,
  bracketType,
  bracketIsPublic,
  resultMemo,
  disabled = false,
}: {
  matchId: string;
  bracketType: string;
  bracketIsPublic?: boolean;
  resultMemo?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPublic = resolveMatchIsPublicSparring({
    bracketType,
    bracketIsPublic,
    resultMemo,
  });
  const canToggle = bracketType !== BracketType.single_elimination && !disabled;

  function toggle() {
    if (!canToggle) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("isPublicSparring", isPublic ? "false" : "true");
      const res = await updateMatchBoutSettingsAction(fd);
      if (res.ok) router.refresh();
    });
  }

  if (!canToggle) {
    return (
      <BoutFormatBadge
        bracketType={bracketType}
        bracketIsPublic={bracketIsPublic}
        resultMemo={resultMemo}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className="inline-flex items-center gap-1"
      title="클릭하여 경기 대전방식 변경"
    >
      <BoutFormatBadge
        bracketType={bracketType}
        bracketIsPublic={bracketIsPublic}
        resultMemo={resultMemo}
      />
      <span className="text-muted-foreground text-[10px] underline">
        {pending ? "저장…" : "변경"}
      </span>
    </button>
  );
}
