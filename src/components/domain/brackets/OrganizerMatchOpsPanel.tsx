"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelMatchAction,
  recordMatchOutcomeDraftAction,
  updateMatchStatusAction,
} from "@/features/matches/actions";
import {
  confirmMatchResultsAction,
  correctMatchResultAction,
  voidMatchResultsAction,
} from "@/features/results/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketType,
} from "@/lib/enums";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: BracketMatchStatus; label: string }[] = [
  { value: BracketMatchStatus.waiting, label: "대기" },
  { value: BracketMatchStatus.called, label: "호출" },
  { value: BracketMatchStatus.ongoing, label: "진행중" },
  { value: BracketMatchStatus.delayed, label: "지연" },
  { value: BracketMatchStatus.finished, label: "종료(운영)" },
  { value: BracketMatchStatus.cancelled, label: "취소" },
];

const OUTCOME_OPTIONS = Object.values(
  BracketMatchOutcomeStyle,
) as BracketMatchOutcomeStyle[];

export type OrganizerMatchOpsPanelProps = {
  bracketType: BracketType;
  matchId: string;
  status: BracketMatchStatus;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
  hasOfficialResults: boolean;
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  resultMemo: string | null;
  compact?: boolean;
};

async function runAction(
  fn: () => Promise<ActionResult<{ ok: true }>>,
): Promise<string | null> {
  const res = await fn();
  if (res.ok) return null;
  return res.error.message;
}

export function OrganizerMatchOpsPanel(props: OrganizerMatchOpsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canFillOutcome = Boolean(props.fighterRedId && props.fighterBlueId);
  const blocked = props.status === BracketMatchStatus.cancelled;

  const defaultOutcomeMode = useMemo(() => {
    if (
      props.resultType === BracketMatchOutcomeStyle.draw ||
      props.resultType === BracketMatchOutcomeStyle.no_contest
    ) {
      return props.resultType === BracketMatchOutcomeStyle.draw
        ? "draw"
        : "no_contest";
    }
    return "win_loss";
  }, [props.resultType]);

  const refresh = () => router.refresh();

  const onStatus = (status: BracketMatchStatus) => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", props.matchId);
      fd.set("status", status);
      const err = await runAction(() => updateMatchStatusAction(fd));
      setError(err);
      if (!err) refresh();
    });
  };

  const onDraftSubmit = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() =>
        recordMatchOutcomeDraftAction(formData),
      );
      setError(err);
      if (!err) refresh();
    });
  };

  const onConfirmSubmit = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => confirmMatchResultsAction(formData));
      setError(err);
      if (!err) refresh();
    });
  };

  const onCorrectSubmit = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => correctMatchResultAction(formData));
      setError(err);
      if (!err) refresh();
    });
  };

  const onVoidSubmit = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => voidMatchResultsAction(formData));
      setError(err);
      if (!err) refresh();
    });
  };

  const onCancelMatch = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => cancelMatchAction(formData));
      setError(err);
      if (!err) refresh();
    });
  };

  return (
    <div
      className={cn(
        "bg-muted/15 space-y-3 rounded-lg border p-3 text-xs",
        props.compact ? "text-[11px]" : "text-xs",
      )}
    >
      <div className="text-muted-foreground flex flex-wrap gap-2">
        <span>브래킷 {props.bracketType}</span>
        {props.hasOfficialResults ? (
          <span className="text-emerald-700 dark:text-emerald-400">
            공식 결과 확정됨
          </span>
        ) : (
          <span>공식 결과 미확정</span>
        )}
      </div>

      {error ? (
        <p className="text-destructive wrap-break-word font-medium">{error}</p>
      ) : null}

      <div className="space-y-1">
        <p className="text-muted-foreground font-semibold">경기 상태</p>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s.value}
              type="button"
              size="xs"
              variant={props.status === s.value ? "default" : "outline"}
              disabled={pending || blocked}
              onClick={() => onStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <form className="space-y-2 border-t pt-2" action={onCancelMatch}>
        <p className="text-muted-foreground font-semibold">경기 취소</p>
        <input
          name="reason"
          placeholder="사유 (선택)"
          disabled={pending || blocked}
          className="border-input bg-background h-8 w-full rounded-md border px-2"
        />
        <Button
          type="submit"
          variant="destructive"
          size="xs"
          disabled={pending || blocked}
        >
          매치 취소
        </Button>
      </form>

      {!blocked && canFillOutcome ? (
        <form className="space-y-2 border-t pt-2" action={onDraftSubmit}>
          <p className="text-muted-foreground font-semibold">
            결과 임시 입력 (MatchResult 미생성)
          </p>
          <select
            name="outcomeMode"
            defaultValue={defaultOutcomeMode}
            disabled={pending}
            className="border-input bg-background h-8 rounded-md border px-2"
          >
            <option value="win_loss">승패</option>
            <option value="draw">무승부</option>
            <option value="no_contest">노콘테스트</option>
          </select>
          <select
            name="winnerId"
            defaultValue={props.winnerId ?? ""}
            disabled={pending}
            className="border-input bg-background h-8 rounded-md border px-2"
          >
            <option value="">승자 선택 (승패 모드)</option>
            {props.fighterRedId ? (
              <option value={props.fighterRedId}>
                레드 · {props.fighterRedName}
              </option>
            ) : null}
            {props.fighterBlueId ? (
              <option value={props.fighterBlueId}>
                블루 · {props.fighterBlueName}
              </option>
            ) : null}
          </select>
          <select
            name="resultType"
            defaultValue={
              props.resultType ?? BracketMatchOutcomeStyle.decision
            }
            disabled={pending}
            className="border-input bg-background h-8 max-w-full rounded-md border px-2"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <textarea
            name="resultMemo"
            placeholder="메모 (선택)"
            rows={2}
            defaultValue={props.resultMemo ?? ""}
            disabled={pending}
            className="border-input bg-background w-full rounded-md border px-2 py-1"
          />
          <Button type="submit" size="xs" variant="secondary" disabled={pending}>
            임시 저장
          </Button>
        </form>
      ) : null}

      {!blocked && canFillOutcome && !props.hasOfficialResults ? (
        <form className="space-y-2 border-t pt-2" action={onConfirmSubmit}>
          <p className="text-muted-foreground font-semibold">
            결과 확정 (MatchResult 2행 · 전적 반영)
          </p>
          <select
            name="outcomeMode"
            defaultValue={defaultOutcomeMode}
            disabled={pending}
            className="border-input bg-background h-8 rounded-md border px-2"
          >
            <option value="win_loss">승패</option>
            <option value="draw">무승부</option>
            <option value="no_contest">노콘테스트</option>
          </select>
          <select
            name="winnerId"
            defaultValue={props.winnerId ?? ""}
            disabled={pending}
            className="border-input bg-background h-8 rounded-md border px-2"
          >
            <option value="">승자 선택 (승패 모드)</option>
            {props.fighterRedId ? (
              <option value={props.fighterRedId}>
                레드 · {props.fighterRedName}
              </option>
            ) : null}
            {props.fighterBlueId ? (
              <option value={props.fighterBlueId}>
                블루 · {props.fighterBlueName}
              </option>
            ) : null}
          </select>
          <select
            name="resultType"
            defaultValue={
              props.resultType ?? BracketMatchOutcomeStyle.decision
            }
            disabled={pending}
            className="border-input bg-background h-8 max-w-full rounded-md border px-2"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <textarea
            name="resultMemo"
            placeholder="메모 (선택)"
            rows={2}
            defaultValue={props.resultMemo ?? ""}
            disabled={pending}
            className="border-input bg-background w-full rounded-md border px-2 py-1"
          />
          <input
            name="reason"
            placeholder="확정 사유 (선택)"
            disabled={pending}
            className="border-input bg-background h-8 w-full rounded-md border px-2"
          />
          <Button type="submit" size="xs" disabled={pending}>
            확정
          </Button>
        </form>
      ) : null}

      {!blocked && props.hasOfficialResults ? (
        <>
          <form className="space-y-2 border-t pt-2" action={onCorrectSubmit}>
            <p className="text-muted-foreground font-semibold">
              결과 정정 (로그 필수)
            </p>
            <select
              name="outcomeMode"
              defaultValue={defaultOutcomeMode}
              disabled={pending}
              className="border-input bg-background h-8 rounded-md border px-2"
            >
              <option value="win_loss">승패</option>
              <option value="draw">무승부</option>
              <option value="no_contest">노콘테스트</option>
            </select>
            <select
              name="winnerId"
              defaultValue={props.winnerId ?? ""}
              disabled={pending}
              className="border-input bg-background h-8 rounded-md border px-2"
            >
              <option value="">승자 선택</option>
              {props.fighterRedId ? (
                <option value={props.fighterRedId}>
                  레드 · {props.fighterRedName}
                </option>
              ) : null}
              {props.fighterBlueId ? (
                <option value={props.fighterBlueId}>
                  블루 · {props.fighterBlueName}
                </option>
              ) : null}
            </select>
            <select
              name="resultType"
              defaultValue={
                props.resultType ?? BracketMatchOutcomeStyle.decision
              }
              disabled={pending}
              className="border-input bg-background h-8 max-w-full rounded-md border px-2"
            >
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <textarea
              name="resultMemo"
              placeholder="메모 (선택)"
              rows={2}
              defaultValue={props.resultMemo ?? ""}
              disabled={pending}
              className="border-input bg-background w-full rounded-md border px-2 py-1"
            />
            <input
              name="reason"
              placeholder="정정 사유 (필수)"
              required
              disabled={pending}
              className="border-input bg-background h-8 w-full rounded-md border px-2"
            />
            <Button type="submit" size="xs" variant="secondary" disabled={pending}>
              정정 반영
            </Button>
          </form>

          <form className="space-y-2 border-t pt-2" action={onVoidSubmit}>
            <p className="text-muted-foreground font-semibold">
              공식 결과 무효 (Bracket 결과 필드 초기화 · 로그)
            </p>
            <input
              name="reason"
              placeholder="무효 사유 (필수)"
              required
              disabled={pending}
              className="border-input bg-background h-8 w-full rounded-md border px-2"
            />
            <Button type="submit" variant="destructive" size="xs" disabled={pending}>
              무효
            </Button>
          </form>
        </>
      ) : null}

      {props.bracketType === BracketType.single_elimination ? (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          단판: 결과 확정 시 승자가 다음 매치 슬롯으로 배치됩니다.
        </p>
      ) : (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          경기 목록형: 다음 라운드 자동 배치 없음.
        </p>
      )}
    </div>
  );
}
