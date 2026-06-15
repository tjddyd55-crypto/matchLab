"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  setDisqualificationReasonFormAction,
  setWeighInFailureResolutionFormAction,
} from "@/features/field-status/actions";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { WeighInFailureResolution } from "@/generated/prisma";

export function WeighInFailureResolutionForm({
  row,
}: {
  row: FieldStatusRowDTO;
}) {
  const [showHandicap, setShowHandicap] = useState(false);
  const [pending, startTransition] = useTransition();

  const isFailed =
    row.weighInStatus === "fail" || row.weighInStatus === "manual_fail";

  if (!isFailed) return null;

  function run(
    resolution: WeighInFailureResolution,
    handicapNote?: string,
  ) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("resolution", resolution);
      if (handicapNote) fd.set("handicapNote", handicapNote);
      const res = await setWeighInFailureResolutionFormAction(fd);
      if (!res.ok) window.alert(res.error.message);
      else setShowHandicap(false);
    });
  }

  if (showHandicap) {
    return (
      <form
        className="flex min-w-[12rem] flex-col gap-1"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const note = (
            e.currentTarget.elements.namedItem("handicapNote") as HTMLTextAreaElement
          ).value;
          run(WeighInFailureResolution.proceed_with_handicap, note);
        }}
      >
        <textarea
          name="handicapNote"
          rows={2}
          defaultValue={row.handicapNote ?? ""}
          placeholder="핸디캡 안내 (관람·대진표에 표시됩니다)"
          className="border-input bg-background w-full rounded-md border px-2 py-1 text-xs"
          maxLength={500}
          required
        />
        <div className="flex gap-1">
          <Button type="submit" size="sm" className="h-7 text-xs" disabled={pending}>
            경기진행 저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowHandicap(false)}
          >
            취소
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={pending}
        onClick={() => setShowHandicap(true)}
      >
        경기진행
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-7 text-xs"
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              `${row.fighterName} 선수의 계체 실패를 경기취소로 처리할까요?`,
            )
          ) {
            run(WeighInFailureResolution.cancel_match);
          }
        }}
      >
        경기취소
      </Button>
      {row.weighInFailureResolution === "proceed_with_handicap" &&
      row.handicapNote ? (
        <span className="text-muted-foreground w-full text-[10px]">
          핸디캡: {row.handicapNote}
        </span>
      ) : null}
    </div>
  );
}

export function DisqualificationReasonForm({
  row,
}: {
  row: FieldStatusRowDTO;
}) {
  const [pending, startTransition] = useTransition();

  if (row.checkInStatus !== "disqualified" && row.checkInStatus !== "pending") {
    return null;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = (
      e.currentTarget.elements.namedItem("reason") as HTMLInputElement
    ).value;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("applicationId", row.applicationId);
      fd.set("reason", reason);
      const res = await setDisqualificationReasonFormAction(fd);
      if (!res.ok) window.alert(res.error.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        name="reason"
        type="text"
        defaultValue={row.disqualificationReason ?? ""}
        placeholder="실격 사유 (필수)"
        className="border-input bg-background h-7 min-w-0 flex-1 rounded-md border px-2 text-xs"
        maxLength={500}
        required
      />
      <Button type="submit" size="sm" className="h-7 shrink-0 text-xs" disabled={pending}>
        저장
      </Button>
    </form>
  );
}
