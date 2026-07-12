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
import {
  staffConfirmMatchResultsAction,
  staffRecordMatchOutcomeDraftAction,
  staffUpdateMatchStatusAction,
} from "@/features/staff-result/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import type { ActionResult } from "@/lib/action-result";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketType,
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { WinnerCornerPicker } from "@/components/domain/brackets/WinnerCornerPicker";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";

const STATUS_OPTIONS: { value: BracketMatchStatus; label: string }[] = [
  { value: BracketMatchStatus.waiting, label: "대기" },
  { value: BracketMatchStatus.called, label: "경기준비" },
  { value: BracketMatchStatus.ongoing, label: "경기진행중" },
  { value: BracketMatchStatus.finished, label: "경기종료" },
  { value: BracketMatchStatus.cancelled, label: "경기취소" },
];

function statusChangeSuccessMessage(status: BracketMatchStatus): string {
  if (status === BracketMatchStatus.cancelled) return "경기가 취소되었습니다.";
  if (status === BracketMatchStatus.finished) return "경기가 종료되었습니다.";
  if (status === BracketMatchStatus.ongoing) return "경기가 시작되었습니다.";
  if (status === BracketMatchStatus.called) return "경기준비 상태로 변경되었습니다.";
  return "경기 상태가 변경되었습니다.";
}

function statusButtonVariant(
  value: BracketMatchStatus,
  isActive: boolean,
  isOperation: boolean,
): "default" | "outline" | "destructive" | "secondary" {
  if (isActive) return "default";
  if (!isOperation) return "outline";
  if (value === BracketMatchStatus.cancelled) return "destructive";
  if (value === BracketMatchStatus.ongoing) return "default";
  return "outline";
}

function MatchOpsStatusSection({
  status,
  pending,
  blocked,
  staff,
  isOperation,
  actionSize,
  onStatus,
}: {
  status: BracketMatchStatus;
  pending: boolean;
  blocked: boolean;
  staff: OrganizerMatchOpsPanelProps["staffAccess"];
  isOperation: boolean;
  actionSize: "xs" | "sm" | "field";
  onStatus: (status: BracketMatchStatus) => void;
}) {
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
        {STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size={isOperation ? actionSize : "xs"}
            variant={statusButtonVariant(option.value, status === option.value, isOperation)}
            disabled={
              pending ||
              blocked ||
              (staff ? !staff.canChangeMatchStatus : false)
            }
            className={isOperation ? "w-full sm:w-auto" : undefined}
            onClick={() => onStatus(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {isOperation && !blocked ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          임의 상태 변경이 필요할 때 선택하세요. 경기취소는 되돌리기 어려울 수
          있습니다.
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingCorrect, setEditingCorrect] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [resultType, setResultType] = useState(
    props.resultType ?? BracketMatchOutcomeStyle.decision,
  );
  const staff = props.staffAccess;
  const isOperation = props.presentation === "operation";
  const actionSize = isOperation ? "field" : props.compact ? "xs" : "sm";

  const canFillOutcome = Boolean(props.fighterRedId && props.fighterBlueId);
  const blocked = props.status === BracketMatchStatus.cancelled;
  const canRecordOutcome =
    !blocked &&
    canFillOutcome &&
    !props.hasOfficialResults &&
    (!staff || staff.canRecordOutcomeDraft);

  const refresh = () => router.refresh();

  const onStatus = (status: BracketMatchStatus) => {
    setError(null);
    setSuccess(null);
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
      if (!err) {
        setSuccess(statusChangeSuccessMessage(status));
        refresh();
      }
    });
  };

  const onOutcomeSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
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

      {staff ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:text-amber-100">
          결과 입력 전용 링크입니다. URL 유출 시 무단 조작 위험이 있으니 현장에서만
          공유하세요. (향후 PIN·전용 계정 도입 TODO)
        </p>
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
          blocked={blocked}
          staff={staff}
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
            {!staff || staff.canConfirmResult ? (
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
            ) : null}
          </div>
        </form>
      ) : null}

      {isOperation ? (
        <MatchOpsStatusSection
          status={props.status}
          pending={pending}
          blocked={blocked}
          staff={staff}
          isOperation={isOperation}
          actionSize={actionSize}
          onStatus={onStatus}
        />
      ) : null}

      {!staff && !blocked && props.hasOfficialResults ? (
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
