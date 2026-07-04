"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMatchCourtFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { cn } from "@/lib/utils";

function resolveCourtSelectState(
  courtId: string | null,
  courts: EventCourtVM[],
  activeCourts: EventCourtVM[],
): {
  selectValue: string;
  hint: string | null;
} {
  const assigned = courtId ? courts.find((c) => c.id === courtId) : null;

  if (assigned?.isActive) {
    return { selectValue: assigned.id, hint: null };
  }

  if (assigned && !assigned.isActive) {
    return {
      selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
      hint: `현재 «${assigned.name}»(비활성)에 배정되어 있습니다. 활성 경기장을 선택해 저장하세요.`,
    };
  }

  if (!courtId) {
    return {
      selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
      hint:
        activeCourts.length > 1
          ? "경기장 미배정 — 활성 경기장을 선택해 주세요."
          : null,
    };
  }

  return {
    selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
    hint: "알 수 없는 경기장 배정입니다. 활성 경기장을 다시 선택해 주세요.",
  };
}

function isSelectableValue(value: string, activeCourts: EventCourtVM[]): boolean {
  return value === "" || activeCourts.some((c) => c.id === value);
}

export function MatchCourtControls({
  eventId,
  matchId,
  bracketId,
  courts,
  courtId,
  courtOrder,
  hasOfficialResults = false,
  inline = false,
  immediate = false,
  hideCourtOrder = false,
  unwrapped = false,
  hideLabels = false,
  compactRow = false,
}: {
  eventId: string;
  matchId: string;
  bracketId?: string;
  courts: EventCourtVM[];
  courtId: string | null;
  courtOrder: number | null;
  hasOfficialResults?: boolean;
  inline?: boolean;
  immediate?: boolean;
  hideCourtOrder?: boolean;
  /** true면 wrapper 없이 경기장 라벨을 부모 grid의 셀로 직접 렌더한다(immediate 전용). */
  unwrapped?: boolean;
  /** compact control row — 경기장 label 숨김, select+버튼 h-8 */
  hideLabels?: boolean;
  compactRow?: boolean;
}) {
  const router = useRouter();
  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );
  const resolved = useMemo(
    () => resolveCourtSelectState(courtId, courts, activeCourts),
    [courtId, courts, activeCourts],
  );

  const [pending, startTransition] = useTransition();
  const [localCourtId, setLocalCourtId] = useState(resolved.selectValue);
  const [localOrder, setLocalOrder] = useState(
    courtOrder != null ? String(courtOrder) : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  const selectValue = isSelectableValue(localCourtId, activeCourts)
    ? localCourtId
    : resolved.selectValue;

  function save(nextCourtId?: string, nextOrder?: string) {
    const court = nextCourtId ?? selectValue;
    const order = nextOrder ?? localOrder;
    if (!court) {
      setMessage("경기장을 선택해 주세요.");
      return;
    }
    if (!activeCourts.some((c) => c.id === court)) {
      setMessage("활성 경기장을 선택해 주세요.");
      return;
    }
    setMessage(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("matchId", matchId);
    if (bracketId) fd.set("bracketId", bracketId);
    fd.set("courtId", court);
    fd.set("courtOrder", order);

    startTransition(async () => {
      const res = await setMatchCourtFormAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage(immediate ? null : "저장됨");
      router.refresh();
    });
  }

  function handleCourtChange(value: string) {
    setLocalCourtId(value);
    if (immediate) {
      save(value, localOrder);
    }
  }

  if (activeCourts.length === 0) {
    return (
      <p className="text-muted-foreground text-[10px]">
        활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
      </p>
    );
  }

  if (unwrapped) {
    return (
      <>
        <label className="flex min-w-0 flex-col gap-0.5 text-xs">
          {hideLabels ? null : (
            <span className="text-muted-foreground text-[10px] font-medium">
              경기장
            </span>
          )}
          <select
            className={cn(
              "border-input bg-background w-full rounded-md border px-2 text-xs",
              compactRow ? "h-8" : "h-8",
            )}
            value={selectValue}
            onChange={(e) => handleCourtChange(e.target.value)}
            required
          >
            {activeCourts.length > 1 && !selectValue ? (
              <option value="">경기장 선택</option>
            ) : null}
            {activeCourts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {resolved.hint ? (
          <p className="text-amber-800 col-span-full text-[10px] dark:text-amber-200">
            {resolved.hint}
          </p>
        ) : null}
        {hasOfficialResults ? (
          <p className="text-amber-800 col-span-full text-[10px] dark:text-amber-200">
            결과 확정 경기 — 경기장만 변경됩니다.
          </p>
        ) : null}
        {message ? (
          <p className="text-muted-foreground col-span-full text-[10px]">
            {message}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        inline
          ? compactRow
            ? "flex flex-wrap items-center gap-2"
            : "flex flex-wrap items-end gap-2"
          : "flex flex-col gap-2 rounded-md border bg-muted/20 p-2",
      )}
    >
      {resolved.hint ? (
        <p className="text-amber-800 w-full text-[10px] dark:text-amber-200">
          {resolved.hint}
        </p>
      ) : null}
      <label
        className={cn(
          "flex flex-col gap-0.5 text-xs",
          compactRow && "min-w-[7rem] flex-1",
        )}
      >
        {hideLabels ? null : (
          <span className="text-muted-foreground text-[10px]">경기장</span>
        )}
        <select
          className={cn(
            "border-input bg-background w-full rounded-md border px-2 text-xs",
            compactRow ? "h-8" : "h-8",
          )}
          value={selectValue}
          onChange={(e) => handleCourtChange(e.target.value)}
          required
        >
          {activeCourts.length > 1 && !selectValue ? (
            <option value="">경기장 선택</option>
          ) : null}
          {activeCourts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {!hideCourtOrder ? (
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground text-[10px]">경기장 순서</span>
          <input
            type="number"
            min={1}
            className="border-input bg-background h-7 w-16 rounded-md border px-2 text-[11px]"
            value={localOrder}
            onChange={(e) => setLocalOrder(e.target.value)}
            placeholder="—"
          />
        </label>
      ) : null}
      {!immediate ? (
        <Button
          type="button"
          size="sm"
          className={cn(
            compactRow ? "h-8 shrink-0 px-3 text-xs" : "h-7 text-[11px]",
          )}
          disabled={pending || !selectValue}
          onClick={() => save()}
        >
          {pending ? "저장 중…" : compactRow ? "저장" : "경기장 저장"}
        </Button>
      ) : pending ? (
        <p className="text-muted-foreground text-[10px]">저장 중…</p>
      ) : null}
      {hasOfficialResults ? (
        <p className="text-amber-800 text-[10px] dark:text-amber-200">
          결과 확정 경기 — 경기장만 변경됩니다.
        </p>
      ) : null}
      {message ? (
        <p className="text-muted-foreground text-[10px]">{message}</p>
      ) : null}
    </div>
  );
}
