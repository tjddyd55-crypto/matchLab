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
import {
  staffConfirmMatchResultsAction,
  staffRecordMatchOutcomeDraftAction,
  staffUpdateMatchStatusAction,
} from "@/features/staff-result/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketType,
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";

const STATUS_OPTIONS: { value: BracketMatchStatus; label: string }[] = [
  { value: BracketMatchStatus.waiting, label: "대기" },
  { value: BracketMatchStatus.called, label: "경기준비" },
  { value: BracketMatchStatus.ongoing, label: "경기진행중" },
  { value: BracketMatchStatus.finished, label: "경기종료" },
  { value: BracketMatchStatus.cancelled, label: "경기취소" },
];

const OUTCOME_OPTIONS = Object.values(
  BracketMatchOutcomeStyle,
) as BracketMatchOutcomeStyle[];

export type OrganizerMatchOpsPanelProps = {
  bracketType: BracketType;
  bracketIsPublic?: boolean;
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
  /** 로그인 없는 결과 입력자 전용 링크 모드 */
  staffAccess?: {
    token: string;
    canChangeMatchStatus: boolean;
    canRecordOutcomeDraft: boolean;
    canConfirmResult: boolean;
  };
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
  const staff = props.staffAccess;

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
      if (staff) fd.set("staffToken", staff.token);
      const err = await runAction(() =>
        staff
          ? staffUpdateMatchStatusAction(fd)
          : updateMatchStatusAction(fd),
      );
      setError(err);
      if (!err) refresh();
    });
  };

  const onOutcomeSubmit = (formData: FormData) => {
    setError(null);
    formData.set("matchId", props.matchId);
    if (staff) formData.set("staffToken", staff.token);
    const intent = String(formData.get("intent") ?? "draft");
    startTransition(async () => {
      const err = await runAction(() =>
        intent === "confirm"
          ? staff
            ? staffConfirmMatchResultsAction(formData)
            : confirmMatchResultsAction(formData)
          : staff
            ? staffRecordMatchOutcomeDraftAction(formData)
            : recordMatchOutcomeDraftAction(formData),
      );
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
      <div className="text-muted-foreground flex flex-wrap items-center gap-2">
        <BoutFormatBadge
          bracketType={props.bracketType}
          bracketIsPublic={props.bracketIsPublic}
        />
        {props.hasOfficialResults ? (
          <span className="text-emerald-700 dark:text-emerald-400">
            공식 결과 확정됨
          </span>
        ) : (
          <span>공식 결과 미확정</span>
        )}
      </div>

      {staff ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:text-amber-100">
          결과 입력 전용 링크입니다. URL 유출 시 무단 조작 위험이 있으니 현장에서만
          공유하세요. (향후 PIN·전용 계정 도입 TODO)
        </p>
      ) : null}

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
              disabled={
                pending ||
                blocked ||
                (staff ? !staff.canChangeMatchStatus : false)
              }
              onClick={() => onStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {!staff ? (
      <form className="space-y-2 border-t pt-2 md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-2 md:space-y-0" action={onCancelMatch}>
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
      ) : null}

      {!blocked && canFillOutcome && (!staff || staff.canRecordOutcomeDraft) ? (
        <form className="space-y-3 border-t pt-2" action={onOutcomeSubmit}>
          <p className="text-muted-foreground font-semibold">결과 입력</p>
          <div className="grid gap-2 lg:grid-cols-4">
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
                  홍코너 · {props.fighterRedName}
                </option>
              ) : null}
              {props.fighterBlueId ? (
                <option value={props.fighterBlueId}>
                  청코너 · {props.fighterBlueName}
                </option>
              ) : null}
            </select>
            <select
              name="resultType"
              defaultValue={
                props.resultType ?? BracketMatchOutcomeStyle.decision
              }
              disabled={pending}
              className="border-input bg-background h-8 max-w-full rounded-md border px-2 lg:col-span-2"
            >
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {outcomeStylePublicLabel(o)}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="resultMemo"
            placeholder="메모 (선택)"
            rows={2}
            defaultValue={props.resultMemo ?? ""}
            disabled={pending}
            className="border-input bg-background w-full rounded-md border px-2 py-1"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="intent"
              value="draft"
              size="xs"
              variant="secondary"
              disabled={pending}
            >
              임시 저장
            </Button>
            {!props.hasOfficialResults && (!staff || staff.canConfirmResult) ? (
              <Button
                type="submit"
                name="intent"
                value="confirm"
                size="xs"
                disabled={pending}
              >
                확정
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {!staff && !blocked && props.hasOfficialResults ? (
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
                  홍코너 · {props.fighterRedName}
                </option>
              ) : null}
              {props.fighterBlueId ? (
                <option value={props.fighterBlueId}>
                  청코너 · {props.fighterBlueName}
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
                  {outcomeStylePublicLabel(o)}
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
