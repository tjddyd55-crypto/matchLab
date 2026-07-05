"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  setDisqualificationReasonFormAction,
  setWeighInFailureResolutionFormAction,
} from "@/features/field-status/actions";
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
  { value: "withdrawal", label: "신청철회", reason: "신청철회" },
  { value: "no_show", label: "미출석", reason: "미출석" },
  { value: "other", label: "기타", reason: "" },
] as const;

function inferPreset(reason: string | null): string {
  if (!reason) return "";
  if (reason === "신청철회") return "withdrawal";
  if (reason === "미출석") return "no_show";
  return "other";
}

export function WeighInFailureResolutionForm({
  row,
  compact = false,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isFailed =
    row.weighInStatus === "fail" || row.weighInStatus === "manual_fail";
  const resolution = row.weighInFailureResolution;

  function run(resolution: WeighInFailureResolution) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("resolution", resolution);
      const res = await setWeighInFailureResolutionFormAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-wrap gap-1",
        compact ? "justify-center" : "min-w-[12rem]",
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={
          resolution === WeighInFailureResolution.proceed_with_handicap
            ? "default"
            : "secondary"
        }
        className="h-8 text-xs"
        disabled={pending}
        onClick={() => run(WeighInFailureResolution.proceed_with_handicap)}
      >
        경기진행
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-8 text-xs"
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
  );
}

export function DisqualificationReasonForm({
  row,
  compact = false,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
    if (preset === "withdrawal") reason = "신청철회";
    else if (preset === "no_show") reason = "미출석";
    else if (preset === "other") {
      reason = otherReason.trim();
      if (!reason) {
        window.alert("기타 사유를 입력해 주세요.");
        return;
      }
    } else {
      window.alert("실격 사유를 선택해 주세요.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("reason", reason);
      const res = await setDisqualificationReasonFormAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      key={`${row.applicationId}-${row.disqualificationReason ?? "none"}`}
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-1.5",
        compact ? "items-center" : "min-w-[12rem]",
      )}
    >
      <select
        name="preset"
        className="border-input bg-background h-8 w-full max-w-full rounded-md border px-2 text-xs"
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
      {preset === "other" ? (
        <input
          name="otherReason"
          type="text"
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          placeholder="기타 사유 입력 (필수)"
          className="border-input bg-background h-8 w-full max-w-full rounded-md border px-2 text-xs"
          maxLength={500}
          required
        />
      ) : null}
      <Button type="submit" size="sm" className="h-8 w-fit text-xs" disabled={pending}>
        사유 저장
      </Button>
    </form>
  );
}
