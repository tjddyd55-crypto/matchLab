"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  staffConfirmMatchResultsAction,
  staffRecordMatchOutcomeDraftAction,
} from "@/features/staff-result/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { BracketMatchOutcomeStyle } from "@/lib/enums";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";
import { cn } from "@/lib/utils";

const WIN_LOSS_TYPES = [
  BracketMatchOutcomeStyle.decision,
  BracketMatchOutcomeStyle.ko,
  BracketMatchOutcomeStyle.tko,
  BracketMatchOutcomeStyle.submission,
  BracketMatchOutcomeStyle.disqualification,
  BracketMatchOutcomeStyle.walkover,
  BracketMatchOutcomeStyle.forfeit,
] as const;

type OutcomeMode = "win_loss" | "draw" | "no_contest";

async function runAction(
  fn: () => Promise<ActionResult<{ ok: true }>>,
): Promise<string | null> {
  const res = await fn();
  if (res.ok) return null;
  return res.error.message;
}

export function StaffMatchResultForm({
  match,
  staffToken,
  canRecordOutcomeDraft,
  canConfirmResult,
  mode,
  onSuccess,
}: {
  match: StaffEventMatchListItemVM;
  staffToken: string;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
  mode: "entry" | "edit" | "view";
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultMode = useMemo((): OutcomeMode => {
    if (match.resultType === BracketMatchOutcomeStyle.draw) return "draw";
    if (match.resultType === BracketMatchOutcomeStyle.no_contest) return "no_contest";
    return "win_loss";
  }, [match.resultType]);

  const [outcomeMode, setOutcomeMode] = useState<OutcomeMode>(defaultMode);
  const [winnerId, setWinnerId] = useState(match.winnerId ?? "");
  const [resultType, setResultType] = useState(
    match.resultType ?? BracketMatchOutcomeStyle.decision,
  );
  const [resultMemo, setResultMemo] = useState(match.resultMemo ?? "");

  const fighterA = match.fighterRed;
  const fighterB = match.fighterBlue;
  const canFill = Boolean(fighterA?.id && fighterB?.id);
  const readOnly = mode === "view" || match.hasOfficialResults;

  const resultTypeOptions =
    outcomeMode === "draw"
      ? [BracketMatchOutcomeStyle.draw]
      : outcomeMode === "no_contest"
        ? [BracketMatchOutcomeStyle.no_contest]
        : WIN_LOSS_TYPES;

  const refresh = () => {
    router.refresh();
    onSuccess?.();
  };

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("staffToken", staffToken);
    fd.set("matchId", match.matchId);
    fd.set("outcomeMode", outcomeMode);
    if (outcomeMode === "win_loss" && winnerId) {
      fd.set("winnerId", winnerId);
    }
    fd.set("resultType", resultType);
    if (resultMemo.trim()) fd.set("resultMemo", resultMemo.trim());
    return fd;
  }

  const handleDraft = () => {
    if (!canRecordOutcomeDraft || readOnly) return;
    setError(null);
    startTransition(async () => {
      const err = await runAction(() =>
        staffRecordMatchOutcomeDraftAction(buildFormData()),
      );
      setError(err);
      if (!err) refresh();
    });
  };

  const handleConfirm = () => {
    if (!canConfirmResult || readOnly) return;
    setError(null);
    startTransition(async () => {
      const err = await runAction(() =>
        staffConfirmMatchResultsAction(buildFormData()),
      );
      setError(err);
      if (!err) refresh();
    });
  };

  if (!canFill) {
    return (
      <p className="text-muted-foreground text-sm">
        양쪽 선수가 배정된 경기만 결과를 입력할 수 있습니다.
      </p>
    );
  }

  if (readOnly) {
    const winnerName =
      match.resultType === BracketMatchOutcomeStyle.draw
        ? "무승부"
        : match.resultType === BracketMatchOutcomeStyle.no_contest
          ? "노콘테스트"
          : match.winnerId === fighterA?.id
            ? fighterA?.name
            : match.winnerId === fighterB?.id
              ? fighterB?.name
              : "—";

    return (
      <div className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">승자</p>
          <p className="font-medium">{winnerName ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">승리 방식</p>
          <p className="font-medium">
            {outcomeStylePublicLabel(match.resultType) ?? "—"}
          </p>
        </div>
        {match.resultMemo ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">메모</p>
            <p className="whitespace-pre-wrap">{match.resultMemo}</p>
          </div>
        ) : null}
        <p className="text-muted-foreground text-xs">
          확정된 결과는 이 링크에서 수정할 수 없습니다. 변경이 필요하면
          주최자에게 요청해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">결과 유형</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["win_loss", "승패"],
              ["draw", "무승부"],
              ["no_contest", "무효"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="lg"
              variant={outcomeMode === value ? "default" : "outline"}
              disabled={pending}
              className="h-11"
              onClick={() => {
                setOutcomeMode(value);
                if (value === "draw") {
                  setResultType(BracketMatchOutcomeStyle.draw);
                  setWinnerId("");
                } else if (value === "no_contest") {
                  setResultType(BracketMatchOutcomeStyle.no_contest);
                  setWinnerId("");
                } else {
                  setResultType(BracketMatchOutcomeStyle.decision);
                }
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {outcomeMode === "win_loss" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">승자 선택</p>
          <div className="grid gap-2">
            {fighterA ? (
              <Button
                type="button"
                size="lg"
                variant={winnerId === fighterA.id ? "default" : "outline"}
                disabled={pending}
                className="h-auto min-h-14 flex-col items-start px-4 py-3 text-left"
                onClick={() => setWinnerId(fighterA.id)}
              >
                <span className="text-xs opacity-80">선수 A</span>
                <span className="line-clamp-2 text-base font-semibold">
                  {fighterA.name}
                </span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {fighterA.gymName ?? "체육관 미상"}
                </span>
              </Button>
            ) : null}
            {fighterB ? (
              <Button
                type="button"
                size="lg"
                variant={winnerId === fighterB.id ? "default" : "outline"}
                disabled={pending}
                className="h-auto min-h-14 flex-col items-start px-4 py-3 text-left"
                onClick={() => setWinnerId(fighterB.id)}
              >
                <span className="text-xs opacity-80">선수 B</span>
                <span className="line-clamp-2 text-base font-semibold">
                  {fighterB.name}
                </span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {fighterB.gymName ?? "체육관 미상"}
                </span>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <label className="block space-y-2 text-sm">
        <span className="font-medium">승리 방식</span>
        <select
          value={resultType}
          disabled={pending || outcomeMode !== "win_loss"}
          onChange={(e) =>
            setResultType(e.target.value as BracketMatchOutcomeStyle)
          }
          className={cn(
            "border-input bg-background h-11 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        >
          {resultTypeOptions.map((type) => (
            <option key={type} value={type}>
              {outcomeStylePublicLabel(type)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">메모 (선택)</span>
        <textarea
          value={resultMemo}
          onChange={(e) => setResultMemo(e.target.value)}
          rows={3}
          disabled={pending}
          placeholder="현장 메모"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-sm"
        />
      </label>

      <div className="flex flex-col gap-2 pt-1">
        {canRecordOutcomeDraft ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={pending}
            className="h-12"
            onClick={handleDraft}
          >
            임시 저장
          </Button>
        ) : null}
        {canConfirmResult ? (
          <Button
            type="button"
            size="lg"
            disabled={pending}
            className="h-12"
            onClick={handleConfirm}
          >
            결과 확정
          </Button>
        ) : null}
        {!canRecordOutcomeDraft && !canConfirmResult ? (
          <p className="text-muted-foreground text-sm">
            이 링크에는 결과 입력 권한이 없습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
