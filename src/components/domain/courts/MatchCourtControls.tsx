"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMatchCourtFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";

export function MatchCourtControls({
  eventId,
  matchId,
  bracketId,
  courts,
  courtId,
  courtOrder,
  hasOfficialResults = false,
  inline = false,
}: {
  eventId: string;
  matchId: string;
  bracketId?: string;
  courts: EventCourtVM[];
  courtId: string | null;
  courtOrder: number | null;
  hasOfficialResults?: boolean;
  inline?: boolean;
}) {
  const router = useRouter();
  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );
  const selectableCourts = useMemo(() => {
    if (!courtId || activeCourts.some((c) => c.id === courtId)) {
      return activeCourts;
    }
    const current = courts.find((c) => c.id === courtId);
    return current ? [current, ...activeCourts] : activeCourts;
  }, [courts, activeCourts, courtId]);

  const defaultCourtId =
    courtId ?? (activeCourts.length === 1 ? activeCourts[0]!.id : "");

  const [pending, startTransition] = useTransition();
  const [localCourtId, setLocalCourtId] = useState(defaultCourtId);
  const [localOrder, setLocalOrder] = useState(
    courtOrder != null ? String(courtOrder) : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    if (!localCourtId) {
      setMessage("경기장을 선택해 주세요.");
      return;
    }
    if (!activeCourts.some((c) => c.id === localCourtId)) {
      setMessage("활성 경기장을 선택해 주세요.");
      return;
    }
    setMessage(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("matchId", matchId);
    if (bracketId) fd.set("bracketId", bracketId);
    fd.set("courtId", localCourtId);
    fd.set("courtOrder", localOrder);

    startTransition(async () => {
      const res = await setMatchCourtFormAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage("저장됨");
      router.refresh();
    });
  }

  if (activeCourts.length === 0) {
    return (
      <p className="text-muted-foreground text-[10px]">
        활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
      </p>
    );
  }

  return (
    <div
      className={
        inline
          ? "flex flex-wrap items-end gap-2"
          : "flex flex-col gap-2 rounded-md border bg-muted/20 p-2"
      }
    >
      <label className="flex flex-col gap-0.5 text-xs">
        <span className="text-muted-foreground text-[10px]">경기장</span>
        <select
          className="border-input bg-background h-7 rounded-md border px-2 text-[11px]"
          value={localCourtId}
          onChange={(e) => setLocalCourtId(e.target.value)}
          required
        >
          {activeCourts.length > 1 && !courtId ? (
            <option value="">경기장 선택</option>
          ) : null}
          {selectableCourts.map((c) => (
            <option key={c.id} value={c.id} disabled={!c.isActive}>
              {c.isActive ? c.name : `${c.name} (비활성 — 다른 경기장 선택)`}
            </option>
          ))}
        </select>
      </label>
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
      <Button
        type="button"
        size="sm"
        className="h-7 text-[11px]"
        disabled={pending || !localCourtId}
        onClick={save}
      >
        {pending ? "저장 중…" : "경기장 저장"}
      </Button>
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
