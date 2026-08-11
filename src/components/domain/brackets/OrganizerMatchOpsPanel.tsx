"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordMatchOutcomeDraftAction,
  updateMatchStatusAction,
} from "@/features/matches/actions";
import {
  confirmMatchResultsAction,
  correctMatchResultAction,
  voidMatchResultsAction,
} from "@/features/results/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import type { ActionResult } from "@/lib/action-result";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketType,
} from "@/lib/enums";
import {
  organizerMatchStatusButtonClassName,
} from "@/lib/ui/organizer-operation-ui";
import {
  BRACKET_MATCH_STATUS_LABELS,
  isCurrentMatchStatus,
} from "@/lib/ui/match-status-ui";
import { WinnerCornerPicker } from "@/components/domain/brackets/WinnerCornerPicker";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: BracketMatchStatus; label: string }[] = [
  { value: BracketMatchStatus.waiting, label: BRACKET_MATCH_STATUS_LABELS.waiting },
  { value: BracketMatchStatus.called, label: BRACKET_MATCH_STATUS_LABELS.called },
  { value: BracketMatchStatus.ongoing, label: BRACKET_MATCH_STATUS_LABELS.ongoing },
  { value: BracketMatchStatus.finished, label: BRACKET_MATCH_STATUS_LABELS.finished },
  { value: BracketMatchStatus.cancelled, label: BRACKET_MATCH_STATUS_LABELS.cancelled },
];

function statusChangeSuccessMessage(status: BracketMatchStatus): string {
  if (status === BracketMatchStatus.cancelled) return "경기가 취소되었습니다.";
  if (status === BracketMatchStatus.finished) return "경기가 종료되었습니다.";
  if (status === BracketMatchStatus.ongoing) return "경기가 시작되었습니다.";
  if (status === BracketMatchStatus.called) return "경기준비 상태로 변경되었습니다.";
  return "경기 상태가 변경되었습니다.";
}

function MatchOpsStatusSection({
  status,
  pending,
  pendingStatus,
  hasOfficialResults,
  isOperation,
  actionSize,
  onStatus,
}: {
  status: BracketMatchStatus;
  pending: boolean;
  pendingStatus: BracketMatchStatus | null;
  hasOfficialResults: boolean;
  isOperation: boolean;
  actionSize: "xs" | "sm" | "field";
  onStatus: (status: BracketMatchStatus) => void;
}) {
  const { confirm } = useAppConfirmDialog();
  const finishedTerminal = status === BracketMatchStatus.finished;
  const cancelledNeedsVoid =
    status === BracketMatchStatus.cancelled && hasOfficialResults;

  function isOptionDisabled(optionValue: BracketMatchStatus): boolean {
    if (pending) return true;
    if (isCurrentMatchStatus(status, optionValue)) return true;
    if (finishedTerminal) return true;
    if (status === BracketMatchStatus.cancelled) {
      if (
        optionValue === BracketMatchStatus.waiting ||
        optionValue === BracketMatchStatus.called ||
        optionValue === BracketMatchStatus.ongoing
      ) {
        return cancelledNeedsVoid;
      }
      return true;
    }
    return false;
  }

  return (
    <div
      className={cn(
        "space-y-2",
        isOperation && "border-t pt-3",
      )}
    >
      <p className="text-muted-foreground text-xs font-semibold">
        {isOperation ? "경기 상태 변경" : "경기 상태"}
      </p>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          isOperation && "sm:flex-row",
        )}
      >
        {STATUS_OPTIONS.map((option) => {
          const isCurrent = isCurrentMatchStatus(status, option.value);
          const isPendingTarget = pendingStatus === option.value;
          const disabled = isOptionDisabled(option.value);

          return (
            <Button
              key={option.value}
              type="button"
              size={isOperation ? actionSize : "xs"}
              variant={
                isOperation ? "outline" : isCurrent ? "default" : "outline"
              }
              disabled={disabled}
              className={cn(
                isOperation ? "w-full sm:w-auto" : undefined,
                isOperation &&
                  organizerMatchStatusButtonClassName(status, option.value, {
                    pendingTarget: isPendingTarget,
                  }),
              )}
              aria-pressed={isCurrent ? "true" : "false"}
              onClick={async () => {
                if (isCurrent || disabled) return;
                if (status === BracketMatchStatus.cancelled) {
                  const ok = await confirm({
                    title: "취소된 경기를 다시 진행 상태로 변경할까요?",
                  });
                  if (!ok) return;
                }
                onStatus(option.value);
              }}
            >
              {isPendingTarget ? `${option.label}…` : option.label}
            </Button>
          );
        })}
      </div>
      {status === BracketMatchStatus.cancelled && cancelledNeedsVoid ? (
        <p className="text-amber-800 text-[11px] leading-snug">
          공식 결과가 있습니다. 결과 초기화 후 대기·경기준비·경기진행중으로
          복구할 수 있습니다.
        </p>
      ) : null}
      {status === BracketMatchStatus.cancelled && !cancelledNeedsVoid ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          취소된 경기를 대기·경기준비·경기진행중으로 복구할 수 있습니다.
        </p>
      ) : null}
      {isOperation &&
      status !== BracketMatchStatus.cancelled &&
      !finishedTerminal ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          임의 상태 변경이 필요할 때 선택하세요.
        </p>
      ) : null}
    </div>
  );
}

const OUTCOME_OPTIONS = Object.values(
  BracketMatchOutcomeStyle,
) as BracketMatchOutcomeStyle[];

type OutcomeMode = "win_loss" | "draw" | "no_contest";

function resolveOutcomeMode(resultType: BracketMatchOutcomeStyle): OutcomeMode {
  if (resultType === BracketMatchOutcomeStyle.draw) return "draw";
  if (resultType === BracketMatchOutcomeStyle.no_contest) return "no_contest";
  return "win_loss";
}

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
  /** 경기 운영 화면 — field 버튼·피드백·상태 버튼 축소 */
  presentation?: "default" | "operation";
  /** 상태 변경 성공 직후 운영 보드 client state 동기화 */
  onStatusChanged?: (matchId: string, status: BracketMatchStatus) => void;
};

async function runAction(
  fn: () => Promise<ActionResult<{ ok: true }>>,
): Promise<string | null> {
  const res = await fn();
  if (res.ok) return null;
  return res.error.message;
}

function MatchOutcomeEntryFields({
  resultType,
  onResultTypeChange,
  pending,
  fighterRedId,
  fighterBlueId,
  fighterRedName,
  fighterBlueName,
  defaultWinnerId,
  defaultMemo,
  winnerPickerKey,
  showCorrectionReason = false,
}: {
  resultType: BracketMatchOutcomeStyle;
  onResultTypeChange: (next: BracketMatchOutcomeStyle) => void;
  pending: boolean;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
  defaultWinnerId?: string | null;
  defaultMemo?: string | null;
  winnerPickerKey: string;
  showCorrectionReason?: boolean;
}) {
  const outcomeMode = resolveOutcomeMode(resultType);

  return (
    <>
      <input type="hidden" name="outcomeMode" value={outcomeMode} />
      <label className="block space-y-1">
        <span className="text-muted-foreground text-[11px] font-semibold">
          결과 방식
        </span>
        <select
          name="resultType"
          value={resultType}
          disabled={pending}
          onChange={(e) =>
            onResultTypeChange(e.target.value as BracketMatchOutcomeStyle)
          }
          className="border-input bg-background h-8 w-full rounded-md border px-2"
        >
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {outcomeStylePublicLabel(o)}
            </option>
          ))}
        </select>
      </label>
      {outcomeMode === "win_loss" ? (
        <WinnerCornerPicker
          key={winnerPickerKey}
          fighterRedId={fighterRedId}
          fighterBlueId={fighterBlueId}
          fighterRedName={fighterRedName}
          fighterBlueName={fighterBlueName}
          defaultWinnerId={defaultWinnerId}
          disabled={pending}
        />
      ) : (
        <input type="hidden" name="winnerId" value="" />
      )}
      <label className="block space-y-1">
        <span className="text-muted-foreground text-[11px] font-semibold">
          메모
        </span>
        <textarea
          name="resultMemo"
          placeholder="메모 (선택)"
          rows={2}
          defaultValue={defaultMemo ?? ""}
          disabled={pending}
          className="border-input bg-background w-full rounded-md border px-2 py-1"
        />
      </label>
      {showCorrectionReason ? (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-[11px] font-semibold">
            정정 사유
          </span>
          <input
            name="reason"
            placeholder="정정 사유 (필수)"
            required
            disabled={pending}
            className="border-input bg-background h-8 w-full rounded-md border px-2"
          />
        </label>
      ) : null}
    </>
  );
}

export function OrganizerMatchOpsPanel(props: OrganizerMatchOpsPanelProps) {
  const resetKey = [
    props.matchId,
    props.hasOfficialResults,
    props.winnerId ?? "",
    props.resultType ?? "",
    props.resultMemo ?? "",
  ].join(":");

  return <OrganizerMatchOpsPanelBody key={resetKey} {...props} />;
}

function OrganizerMatchOpsPanelBody(props: OrganizerMatchOpsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<BracketMatchStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingCorrect, setEditingCorrect] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [resultType, setResultType] = useState(
    props.resultType ?? BracketMatchOutcomeStyle.decision,
  );
  const isOperation = props.presentation === "operation";
  const actionSize = isOperation ? "field" : props.compact ? "xs" : "sm";

  const canFillOutcome = Boolean(props.fighterRedId && props.fighterBlueId);
  const cancelled = props.status === BracketMatchStatus.cancelled;
  const canRecordOutcome =
    !cancelled && canFillOutcome && !props.hasOfficialResults;

  const refresh = () => router.refresh();

  const onStatus = (status: BracketMatchStatus) => {
    if (isCurrentMatchStatus(props.status, status)) return;
    setError(null);
    setSuccess(null);
    setPendingStatus(status);
    const previousStatus = props.status;
    props.onStatusChanged?.(props.matchId, status);
    void (async () => {
      try {
        const fd = new FormData();
        fd.set("matchId", props.matchId);
        fd.set("status", status);
        const err = await runAction(() => updateMatchStatusAction(fd));
        setPendingStatus(null);
        setError(err);
        if (err) {
          props.onStatusChanged?.(props.matchId, previousStatus);
          return;
        }
        setSuccess(statusChangeSuccessMessage(status));
        refresh();
      } catch (cause) {
        setPendingStatus(null);
        props.onStatusChanged?.(props.matchId, previousStatus);
        setError(
          cause instanceof Error
            ? cause.message
            : "처리 중 오류가 발생했습니다.",
        );
      }
    })();
  };

  const onOutcomeSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    formData.set("matchId", props.matchId);
    const intent = String(formData.get("intent") ?? "draft");
    startTransition(async () => {
      const err = await runAction(() =>
        intent === "confirm"
          ? confirmMatchResultsAction(formData)
          : recordMatchOutcomeDraftAction(formData),
      );
      setError(err);
      if (!err) {
        setSuccess(
          intent === "confirm"
            ? "경기 결과가 확정되었습니다."
            : "임시저장 완료",
        );
        refresh();
      }
    });
  };

  const onCorrectSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => correctMatchResultAction(formData));
      setError(err);
      if (!err) {
        setSuccess("변경사항이 반영되었습니다.");
        setEditingCorrect(false);
        refresh();
      }
    });
  };

  const onVoidSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    formData.set("matchId", props.matchId);
    startTransition(async () => {
      const err = await runAction(() => voidMatchResultsAction(formData));
      setError(err);
      if (!err) {
        setSuccess("공식 결과가 무효 처리되었습니다.");
        setShowVoidForm(false);
        refresh();
      }
    });
  };

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 text-xs",
        props.compact && !isOperation ? "text-[11px]" : "text-xs",
        isOperation ? "border-border" : "bg-muted/15",
      )}
    >
      <CardContent className="space-y-3 p-3">
      {!props.compact && !isOperation ? (
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
      ) : null}

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage tone="success">{success}</FeedbackMessage>
      ) : null}

      {!isOperation ? (
        <MatchOpsStatusSection
          status={props.status}
          pending={pending}
          pendingStatus={pendingStatus}
          hasOfficialResults={props.hasOfficialResults}
          isOperation={isOperation}
          actionSize={actionSize}
          onStatus={onStatus}
        />
      ) : null}

      {canRecordOutcome ? (
        <form
          className={cn("space-y-3", !isOperation && "border-t pt-3")}
          action={onOutcomeSubmit}
        >
          {isOperation ? (
            <p className="text-muted-foreground text-xs font-semibold">
              결과 입력
            </p>
          ) : null}
          <MatchOutcomeEntryFields
            resultType={resultType}
            onResultTypeChange={setResultType}
            pending={pending}
            fighterRedId={props.fighterRedId}
            fighterBlueId={props.fighterBlueId}
            fighterRedName={props.fighterRedName}
            fighterBlueName={props.fighterBlueName}
            defaultWinnerId={props.winnerId}
            defaultMemo={props.resultMemo}
            winnerPickerKey={`entry-${props.matchId}-${props.winnerId ?? "none"}`}
          />
          <div className={cn("flex flex-col gap-2 sm:flex-row", isOperation && "sm:flex-wrap")}>
            <Button
              type="submit"
              name="intent"
              value="draft"
              size={actionSize}
              variant="outline"
              disabled={pending}
              className={isOperation ? "w-full sm:w-auto" : undefined}
            >
              임시저장
            </Button>
            <Button
              type="submit"
              name="intent"
              value="confirm"
              size={actionSize}
              disabled={pending}
              className={isOperation ? "w-full sm:w-auto" : undefined}
            >
              확정
            </Button>
          </div>
        </form>
      ) : null}

      {isOperation ? (
        <MatchOpsStatusSection
          status={props.status}
          pending={pending}
          pendingStatus={pendingStatus}
          hasOfficialResults={props.hasOfficialResults}
          isOperation={isOperation}
          actionSize={actionSize}
          onStatus={onStatus}
        />
      ) : null}

      {!cancelled && props.hasOfficialResults ? (
        <div className="space-y-2 border-t pt-2">
          {!editingCorrect ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] leading-snug">
                결과가 확정되었습니다. 수정이 필요할 때만 정정 폼을 엽니다.
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={pending}
                onClick={() => setEditingCorrect(true)}
              >
                결과 수정
              </Button>
            </div>
          ) : (
            <form className="space-y-2" action={onCorrectSubmit}>
              <p className="text-muted-foreground font-semibold">
                결과 정정 (로그 필수)
              </p>
              <MatchOutcomeEntryFields
                resultType={resultType}
                onResultTypeChange={setResultType}
                pending={pending}
                fighterRedId={props.fighterRedId}
                fighterBlueId={props.fighterBlueId}
                fighterRedName={props.fighterRedName}
                fighterBlueName={props.fighterBlueName}
                defaultWinnerId={props.winnerId}
                defaultMemo={props.resultMemo}
                winnerPickerKey={`correct-${props.matchId}-${props.winnerId ?? "none"}`}
                showCorrectionReason
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="xs"
                  variant="secondary"
                  disabled={pending}
                >
                  정정 반영
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setEditingCorrect(false);
                    setResultType(
                      props.resultType ?? BracketMatchOutcomeStyle.decision,
                    );
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          )}

          {!showVoidForm ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              disabled={pending || editingCorrect}
              onClick={() => setShowVoidForm(true)}
            >
              공식 결과 무효 처리
            </Button>
          ) : (
            <form className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2" action={onVoidSubmit}>
              <p className="text-destructive text-[11px] font-semibold">
                공식 결과 무효 (Bracket 결과 필드 초기화 · 로그)
              </p>
              <input
                name="reason"
                placeholder="무효 사유 (필수)"
                required
                disabled={pending}
                className="border-input bg-background h-8 w-full rounded-md border px-2"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="destructive"
                  size="xs"
                  disabled={pending}
                >
                  무효
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setShowVoidForm(false)}
                >
                  취소
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {!props.compact && props.bracketType === BracketType.single_elimination ? (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          단판: 결과 확정 시 승자가 다음 매치 슬롯으로 배치됩니다.
        </p>
      ) : !props.compact ? (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          경기 목록형: 다음 라운드 자동 배치 없음.
        </p>
      ) : null}
      </CardContent>
    </Card>
  );
}
