"use client";

import { useRef, useState, useTransition } from "react";
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
import type { ActionResult } from "@/lib/action-result";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketType,
} from "@/lib/enums";
import {
  organizerMatchStatusButtonClassName,
  organizerOperationDetailActionButtonClass,
  organizerOperationDetailActionRowClass,
  organizerOperationDetailFieldLabelClass,
  organizerOperationDetailFieldStackClass,
  organizerOperationDetailFootnoteClass,
  organizerOperationDetailInnerClass,
  organizerOperationDetailLabelControlClass,
  organizerOperationDetailMajorSectionClass,
  organizerOperationDetailStatusStackClass,
  organizerOperationSectionTitleClass,
} from "@/lib/ui/organizer-operation-ui";
import {
  BRACKET_MATCH_STATUS_LABELS,
  isCurrentMatchStatus,
} from "@/lib/ui/match-status-ui";
import { WinnerCornerPicker } from "@/components/domain/brackets/WinnerCornerPicker";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import {
  MatchOpsJudgeScoreSection,
  type MatchOpsJudgeScoreSectionHandle,
} from "@/components/domain/operation/MatchOpsJudgeScoreSection";
import { MatchOpsMatchInfoBar } from "@/components/domain/operation/MatchOpsMatchInfoBar";
import { MatchOpsConfirmedResultPanel } from "@/components/domain/operation/MatchOpsConfirmedResultPanel";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { cn } from "@/lib/utils";
import {
  appendOnsiteOpsToken,
  useOnsiteOpsToken,
} from "@/components/domain/onsite-ops/OnsiteOpsTokenContext";

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
  function isOptionDisabled(optionValue: BracketMatchStatus): boolean {
    if (pending) return true;
    return isCurrentMatchStatus(status, optionValue);
  }

  return (
    <div
      className={cn(
        isOperation
          ? cn(
              organizerOperationDetailMajorSectionClass,
              organizerOperationDetailStatusStackClass,
            )
          : "space-y-1.5",
      )}
    >
      <p
        className={cn(
          isOperation
            ? organizerOperationSectionTitleClass
            : "text-muted-foreground text-xs font-semibold",
        )}
      >
        {isOperation ? "경기 상태" : "경기 상태"}
      </p>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          !isOperation && "gap-1.5 sm:flex-row",
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
              onClick={() => {
                if (isCurrent || disabled) return;
                onStatus(option.value);
              }}
            >
              {isPendingTarget ? `${option.label}…` : option.label}
            </Button>
          );
        })}
      </div>
      {status === BracketMatchStatus.cancelled ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          취소된 경기도 운영 상태를 자유롭게 변경할 수 있습니다.
          {hasOfficialResults
            ? " 공식 결과는 유지되며, 결과 무효화는 별도 메뉴에서 처리합니다."
            : null}
        </p>
      ) : null}
      {status === BracketMatchStatus.finished && hasOfficialResults ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          공식 결과가 확정된 경기도 운영 상태만 변경할 수 있습니다. 결과
          데이터는 자동으로 삭제되지 않습니다.
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
  /** 라운드/시간 등 운영 설정이 포함된 원본 resultMemo */
  operationalResultMemo?: string | null;
  orderLabel?: string | null;
  division?: EventDivisionDisplayInput | null;
  divisionLabel?: string | null;
  courtName?: string | null;
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
  compact = false,
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
  compact?: boolean;
}) {
  const outcomeMode = resolveOutcomeMode(resultType);
  const labelClass = compact
    ? organizerOperationDetailFieldLabelClass
    : "text-muted-foreground text-[11px] font-semibold";
  const fieldWrapClass = compact
    ? organizerOperationDetailLabelControlClass
    : cn("block", compact ? "space-y-0.5" : "space-y-1");

  const fields = (
    <>
      <input type="hidden" name="outcomeMode" value={outcomeMode} />
      <input type="hidden" name="resultType" value={resultType} />
      <div className={fieldWrapClass}>
        <span className={labelClass}>결과 방식</span>
        <div className="flex flex-wrap gap-1.5">
          {OUTCOME_OPTIONS.map((option) => {
            const active = resultType === option;
            return (
              <button
                key={option}
                type="button"
                disabled={pending}
                aria-pressed={active}
                data-testid={`match-result-type-${option}`}
                onClick={() => onResultTypeChange(option)}
                className={cn(
                  "rounded-md border px-2.5 text-xs font-medium transition-colors",
                  compact ? "min-h-[34px]" : "min-h-[36px]",
                  active
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-input bg-background hover:bg-muted/50",
                )}
              >
                {outcomeStylePublicLabel(option)}
              </button>
            );
          })}
        </div>
      </div>
      {outcomeMode === "win_loss" ? (
        <WinnerCornerPicker
          key={winnerPickerKey}
          fighterRedId={fighterRedId}
          fighterBlueId={fighterBlueId}
          fighterRedName={fighterRedName}
          fighterBlueName={fighterBlueName}
          defaultWinnerId={defaultWinnerId}
          disabled={pending}
          compact={compact}
        />
      ) : (
        <input type="hidden" name="winnerId" value="" />
      )}
      <label className={fieldWrapClass}>
        <span className={labelClass}>메모</span>
        <textarea
          name="resultMemo"
          placeholder="메모 (선택)"
          rows={compact ? 2 : 2}
          defaultValue={defaultMemo ?? ""}
          disabled={pending}
          className={cn(
            "border-input bg-background w-full rounded-md border px-2 py-1",
            compact && "min-h-[50px] resize-y",
          )}
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

  if (compact) {
    return (
      <div className={organizerOperationDetailFieldStackClass}>{fields}</div>
    );
  }

  return fields;
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
  const opsToken = useOnsiteOpsToken();
  const judgeScoreRef = useRef<MatchOpsJudgeScoreSectionHandle>(null);
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
  const actionSize = isOperation ? "sm" : props.compact ? "xs" : "sm";

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
        appendOnsiteOpsToken(fd, opsToken);
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
    appendOnsiteOpsToken(formData, opsToken);
    const intent = String(formData.get("intent") ?? "draft");
    startTransition(async () => {
      if (isOperation && judgeScoreRef.current) {
        const scoreErr = await judgeScoreRef.current.saveScores();
        if (scoreErr) {
          setError(scoreErr);
          return;
        }
      }

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
    appendOnsiteOpsToken(formData, opsToken);
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
    appendOnsiteOpsToken(formData, opsToken);
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

  const panelBody = (
    <>
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
        <FeedbackMessage tone="error" role="alert" className={isOperation ? "mb-3" : undefined}>
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage tone="success" className={isOperation ? "mb-3" : undefined}>
          {success}
        </FeedbackMessage>
      ) : null}

      {isOperation && props.orderLabel ? (
        <MatchOpsMatchInfoBar
          orderLabel={props.orderLabel}
          division={props.division ?? null}
          divisionLabel={props.divisionLabel ?? null}
          courtName={props.courtName ?? null}
          status={props.status}
          fighterRedName={props.fighterRedName}
          fighterBlueName={props.fighterBlueName}
          matchId={props.matchId}
          resultMemo={
            props.operationalResultMemo ?? props.resultMemo
          }
          readOnlyRules={props.hasOfficialResults && !editingCorrect}
        />
      ) : null}

      {isOperation && props.hasOfficialResults && !editingCorrect ? (
        <MatchOpsConfirmedResultPanel
          matchId={props.matchId}
          hasOfficialResults={props.hasOfficialResults}
          winnerId={props.winnerId}
          resultType={props.resultType}
          fighterRedId={props.fighterRedId}
          fighterBlueId={props.fighterBlueId}
          fighterRedName={props.fighterRedName}
          fighterBlueName={props.fighterBlueName}
          opsToken={opsToken ?? undefined}
          resetKey={`${props.matchId}:${props.hasOfficialResults}:${props.winnerId ?? ""}`}
        />
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

      {isOperation ? (
        <MatchOpsJudgeScoreSection
          ref={judgeScoreRef}
          matchId={props.matchId}
          resetKey={`${props.matchId}:${props.hasOfficialResults}:${props.status}`}
          integratedSave={canRecordOutcome}
          showVoteSummary={!props.hasOfficialResults || editingCorrect}
        />
      ) : null}

      {canRecordOutcome ? (
        <form
          className={cn(
            isOperation ? "flex flex-col" : "space-y-3 border-t pt-3",
          )}
          action={onOutcomeSubmit}
        >
          {isOperation ? (
            <p className={organizerOperationSectionTitleClass}>최종결과</p>
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
            compact={isOperation}
          />
          <div
            className={cn(
              isOperation
                ? organizerOperationDetailActionRowClass
                : "flex flex-col gap-2 sm:flex-row",
            )}
          >
            <Button
              type="submit"
              name="intent"
              value="draft"
              size={actionSize}
              variant="outline"
              disabled={pending}
              className={cn(
                isOperation &&
                  cn(
                    organizerOperationDetailActionButtonClass,
                    "w-full sm:w-auto",
                  ),
              )}
            >
              임시저장
            </Button>
            <Button
              type="submit"
              name="intent"
              value="confirm"
              size={actionSize}
              disabled={pending}
              data-testid="match-result-confirm"
              className={cn(
                isOperation &&
                  cn(
                    organizerOperationDetailActionButtonClass,
                    "w-full sm:w-auto",
                  ),
              )}
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
                compact={isOperation}
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

      {!isOperation &&
      !props.compact &&
      props.bracketType === BracketType.single_elimination ? (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          단판: 결과 확정 시 승자가 다음 매치 슬롯으로 배치됩니다.
        </p>
      ) : !isOperation && !props.compact ? (
        <p className="text-muted-foreground border-t pt-2 text-[11px]">
          경기 목록형: 다음 라운드 자동 배치 없음.
        </p>
      ) : isOperation ? (
        <p className={organizerOperationDetailFootnoteClass}>
          {props.bracketType === BracketType.single_elimination
            ? "단판: 결과 확정 시 승자가 다음 매치 슬롯으로 배치됩니다."
            : "경기 목록형: 다음 라운드 자동 배치 없음."}
        </p>
      ) : null}
    </>
  );

  if (isOperation) {
    return (
      <div className={organizerOperationDetailInnerClass}>{panelBody}</div>
    );
  }

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden bg-muted/15 py-0 text-xs shadow-none",
        props.compact ? "text-[11px]" : "text-xs",
      )}
    >
      <CardContent className="space-y-3 p-3">{panelBody}</CardContent>
    </Card>
  );
}
