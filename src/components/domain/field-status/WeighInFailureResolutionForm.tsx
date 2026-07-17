"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  setDisqualificationReasonFormAction,
  setWeighInFailureResolutionFormAction,
} from "@/features/field-status/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { WeighInFailureResolution } from "@/generated/prisma";
import { cn } from "@/lib/utils";

/**
 * 계체 실패 처리 폼.
 * - "경기진행": 핸디캡 적용 후 경기 진행을 허용(proceed_with_handicap). 별도 메모 없이 상태만 저장한다.
 * - "경기취소": cancel_match. 대진 후보/경기운영에서 배치 불가로 처리된다.
 * 출전 가능 판단은 computeFieldEligibility / computeBracketAssignability(SSOT)가 담당한다.
 */

const DISQUALIFICATION_PRESETS = [
  { value: "no_show", label: "미출석", reason: "미출석" },
  { value: "weigh_fail", label: "계체 실패", reason: "계체 실패" },
  { value: "injury", label: "부상", reason: "부상" },
  { value: "withdrawal", label: "선수 포기", reason: "선수 포기" },
  { value: "ineligible", label: "자격 미달", reason: "자격 미달" },
  { value: "rule_violation", label: "규정 위반", reason: "규정 위반" },
  { value: "other", label: "기타", reason: "" },
] as const;

function inferPreset(reason: string | null): string {
  if (!reason) return "";
  const exact = DISQUALIFICATION_PRESETS.find(
    (p) => p.reason && p.reason === reason,
  );
  if (exact) return exact.value;
  if (reason === "신청철회") return "withdrawal";
  return "other";
}

export function WeighInFailureResolutionForm({
  row,
  compact = false,
  touchFriendly = false,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const isFailed =
    row.weighInStatus === "fail" || row.weighInStatus === "manual_fail";
  const resolution = row.weighInFailureResolution;

  function run(resolutionValue: WeighInFailureResolution) {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("resolution", resolutionValue);
      const res = await setWeighInFailureResolutionFormAction(fd);
      if (!res.ok) {
        setFeedback({
          tone: "error",
          message: res.error.message || "저장에 실패했습니다.",
        });
        return;
      }
      setFeedback({
        tone: "success",
        message:
          resolutionValue === WeighInFailureResolution.cancel_match
            ? "경기취소로 처리되었습니다."
            : "계체 상태가 저장되었습니다.",
      });
      router.refresh();
    });
  }

  const btnSize = touchFriendly ? "field" : "sm";
  const btnClass = touchFriendly
    ? "w-full sm:w-auto"
    : "h-[34px] min-w-[4.5rem] px-2 text-xs";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-1",
        compact ? "items-center" : "min-w-[12rem]",
      )}
    >
      <div
        className={cn(
          "flex w-full flex-wrap gap-1",
          compact ? "items-center justify-center" : "",
          touchFriendly && "flex-col sm:flex-row",
        )}
      >
      <Button
        type="button"
        size={btnSize}
        variant={
          resolution === WeighInFailureResolution.proceed_with_handicap
            ? "default"
            : "outline"
        }
        className={btnClass}
        disabled={pending}
        onClick={() => run(WeighInFailureResolution.proceed_with_handicap)}
      >
        경기진행
      </Button>
      <Button
        type="button"
        size={btnSize}
        variant="destructive"
        className={btnClass}
        disabled={pending}
        onClick={() => {
          const message = isFailed
            ? `${row.fighterName} 선수의 계체 실패를 경기취소로 처리할까요?`
            : `${row.fighterName} 선수를 경기취소 처리할까요?`;
          if (window.confirm(message)) {
            run(WeighInFailureResolution.cancel_match);
          }
        }}
      >
        경기취소
      </Button>
      </div>
      {feedback ? (
        <FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage>
      ) : null}
    </div>
  );
}

export function DisqualificationReasonForm({
  row,
  compact = false,
  touchFriendly = false,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
  touchFriendly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [preset, setPreset] = useState(() =>
    inferPreset(row.disqualificationReason),
  );
  const [otherReason, setOtherReason] = useState(() =>
    inferPreset(row.disqualificationReason) === "other"
      ? row.disqualificationReason ?? ""
      : "",
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let reason = "";
    const presetMeta = DISQUALIFICATION_PRESETS.find((p) => p.value === preset);
    if (preset === "other") {
      reason = otherReason.trim();
      if (!reason) {
        window.alert("기타 사유를 입력해 주세요.");
        return;
      }
    } else if (presetMeta?.reason) {
      reason = presetMeta.reason;
    } else {
      window.alert("실격 사유를 선택해 주세요.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("reason", reason);
      const res = await setDisqualificationReasonFormAction(fd);
      if (!res.ok) {
        setFeedback({
          tone: "error",
          message: res.error.message || "저장에 실패했습니다.",
        });
        return;
      }
      setFeedback({ tone: "success", message: "실격 사유가 저장되었습니다." });
      router.refresh();
    });
  }

  const inputClass = cn(
    "border-input bg-background w-full max-w-full rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    touchFriendly ? "h-11 text-sm" : "h-8",
  );

  return (
    <form
      key={`${row.applicationId}-${row.disqualificationReason ?? "none"}`}
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-1",
        compact ? "items-center" : "min-w-[12rem]",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 gap-1",
          compact ? "flex-wrap items-center justify-center" : "flex-col",
        )}
      >
        <select
          name="preset"
          className={cn(inputClass, compact && "min-w-0 flex-1")}
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          required
        >
          <option value="">사유 선택</option>
          {DISQUALIFICATION_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size={touchFriendly ? "field" : "sm"}
          variant="default"
          className={
            touchFriendly
              ? "w-full shrink-0 sm:w-fit"
              : "h-[34px] shrink-0 px-2 text-xs"
          }
          disabled={pending}
        >
          저장
        </Button>
      </div>
      {preset === "other" ? (
        <input
          name="otherReason"
          type="text"
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          placeholder="기타 사유 입력 (필수)"
          className={inputClass}
          maxLength={500}
          required
        />
      ) : null}
      {feedback ? (
        <FeedbackMessage tone={feedback.tone} className="text-xs">
          {feedback.message}
        </FeedbackMessage>
      ) : null}
    </form>
  );
}
