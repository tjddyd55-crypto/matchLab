"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMatchBoutSettingsAction } from "@/features/matches/actions";
import { BracketType } from "@/lib/enums";
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";
import { resolveBoutFormatKind } from "@/lib/bout-format";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { cn } from "@/lib/utils";

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
  const kind = resolveBoutFormatKind({
    bracketType,
    bracketIsPublic,
    resultMemo,
  });

  function toggle() {
    if (!canToggle) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("isPublicSparring", isPublic ? "false" : "true");
      const res = await updateMatchBoutSettingsAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
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
      className={cn(
        "inline-flex rounded-full transition-shadow",
        "hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary/50",
        pending && "opacity-70",
      )}
      title={
        kind === "public_sparring"
          ? "클릭하여 원매치로 되돌리기"
          : "클릭하여 공개스파링으로 변경"
      }
    >
      <BoutFormatBadge
        bracketType={bracketType}
        bracketIsPublic={bracketIsPublic}
        resultMemo={resultMemo}
      />
    </button>
  );
}
