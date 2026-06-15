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

function HandicapNoteCard({ note }: { note: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-md border px-2.5 py-2 text-xs",
        "border-amber-300 bg-amber-50 text-amber-950",
        "dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100",
      )}
      role="status"
    >
      <p className="font-semibold">핸디캡 안내</p>
      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{note}</p>
    </div>
  );
}

function SavedDisqualificationReason({ reason }: { reason: string }) {
  return (
    <p className="text-muted-foreground text-[11px] leading-snug">
      저장된 사유: <span className="text-foreground font-medium">{reason}</span>
    </p>
  );
}

export function WeighInFailureResolutionForm({
  row,
}: {
  row: FieldStatusRowDTO;
}) {
  const router = useRouter();
  const [showHandicap, setShowHandicap] = useState(false);
  const [pending, startTransition] = useTransition();

  const isFailed =
    row.weighInStatus === "fail" || row.weighInStatus === "manual_fail";

  if (!isFailed) return null;

  const savedHandicap =
    row.weighInFailureResolution === WeighInFailureResolution.proceed_with_handicap &&
    row.handicapNote;

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
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      setShowHandicap(false);
      router.refresh();
    });
  }

  if (showHandicap) {
    return (
      <form
        className="flex min-w-[12rem] flex-col gap-1.5"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const note = (
            e.currentTarget.elements.namedItem("handicapNote") as HTMLTextAreaElement
          ).value.trim();
          if (!note) {
            window.alert("핸디캡 안내를 입력해 주세요.");
            return;
          }
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
            disabled={pending}
            onClick={() => setShowHandicap(false)}
          >
            취소
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-1.5">
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
      </div>
      {savedHandicap ? <HandicapNoteCard note={row.handicapNote!} /> : null}
    </div>
  );
}

export function DisqualificationReasonForm({
  row,
}: {
  row: FieldStatusRowDTO;
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

  if (row.checkInStatus !== "disqualified") {
    return null;
  }

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
      className="flex min-w-[12rem] flex-col gap-1.5"
    >
      <select
        name="preset"
        className="border-input bg-background h-7 rounded-md border px-2 text-xs"
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
        required
      >
        <option value="" disabled>
          사유 선택
        </option>
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
          className="border-input bg-background h-7 rounded-md border px-2 text-xs"
          maxLength={500}
          required
        />
      ) : null}
      <Button type="submit" size="sm" className="h-7 w-fit text-xs" disabled={pending}>
        사유 저장
      </Button>
      {row.disqualificationReason ? (
        <SavedDisqualificationReason reason={row.disqualificationReason} />
      ) : null}
    </form>
  );
}
