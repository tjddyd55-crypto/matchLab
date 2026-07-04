"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMatchOperationalSettingsAction } from "@/features/matches/actions";
import {
  MATCH_ROUND_COUNT_OPTIONS,
  MATCH_ROUND_TIME_SEC_OPTIONS,
  formatRoundCountLabel,
  formatRoundTimeLabel,
} from "@/lib/match-operational-settings-options";
import {
  DEFAULT_MATCH_OPERATIONAL_SETTINGS,
  parseMatchOperationalSettings,
} from "@/lib/match-operational-settings";
import { cn } from "@/lib/utils";

export function MatchOperationalSettingsSelect({
  matchId,
  resultMemo,
  disabled = false,
  className,
  unwrapped = false,
  hideLabels = false,
  inline = false,
}: {
  matchId: string;
  resultMemo?: string | null;
  disabled?: boolean;
  className?: string;
  /** true면 wrapper 없이 라운드·시간 라벨을 부모 grid의 셀로 직접 렌더한다. */
  unwrapped?: boolean;
  hideLabels?: boolean;
  inline?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { settings } = parseMatchOperationalSettings(resultMemo);
  const roundCount = settings.roundCount ?? DEFAULT_MATCH_OPERATIONAL_SETTINGS.roundCount;
  const roundTimeSec =
    settings.roundTimeSec ?? DEFAULT_MATCH_OPERATIONAL_SETTINGS.roundTimeSec;

  function save(next: { roundCount?: number; roundTimeSec?: number }) {
    if (disabled) return;
    const fd = new FormData();
    fd.set("matchId", matchId);
    fd.set("roundCount", String(next.roundCount ?? roundCount));
    fd.set("roundTimeSec", String(next.roundTimeSec ?? roundTimeSec));
    startTransition(async () => {
      const res = await updateMatchOperationalSettingsAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  const selectClass =
    "border-input bg-background h-8 min-w-[4.5rem] rounded-md border px-2 text-xs";

  const fields = (
    <>
      <label className="flex min-w-0 flex-col gap-0.5 text-xs">
        {hideLabels ? null : (
          <span className="text-muted-foreground text-[10px] font-medium">
            라운드
          </span>
        )}
        <select
          className={selectClass}
          value={roundCount}
          disabled={disabled || pending}
          onChange={(e) => save({ roundCount: Number(e.target.value) })}
        >
          {MATCH_ROUND_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {formatRoundCountLabel(n)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-0.5 text-xs">
        {hideLabels ? null : (
          <span className="text-muted-foreground text-[10px] font-medium">
            시간
          </span>
        )}
        <select
          className={selectClass}
          value={roundTimeSec}
          disabled={disabled || pending}
          onChange={(e) => save({ roundTimeSec: Number(e.target.value) })}
        >
          {MATCH_ROUND_TIME_SEC_OPTIONS.map((sec) => (
            <option key={sec} value={sec}>
              {formatRoundTimeLabel(sec)}
            </option>
          ))}
        </select>
      </label>
      {pending ? (
        <p className="text-muted-foreground col-span-full text-[10px]">저장 중…</p>
      ) : null}
    </>
  );

  if (unwrapped) {
    return fields;
  }

  return (
    <div
      className={cn(
        inline
          ? "flex flex-wrap items-center gap-2"
          : "grid w-full gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {fields}
    </div>
  );
}
