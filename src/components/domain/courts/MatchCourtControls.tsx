"use client";

import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const [localCourtId, setLocalCourtId] = useState(courtId ?? "");
  const [localOrder, setLocalOrder] = useState(
    courtOrder != null ? String(courtOrder) : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  const activeCourts = courts.filter((c) => c.isActive);

  function save() {
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
        >
          <option value="">미지정</option>
          {activeCourts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        disabled={pending}
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
