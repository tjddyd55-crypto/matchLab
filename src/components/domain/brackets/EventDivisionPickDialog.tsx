"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";
import type { OrganizerEventAllMatchesDivisionOptionVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";

export function EventDivisionPickDialog({
  open,
  onOpenChange,
  title,
  description,
  divisions,
  courts,
  suggestedDivisionId,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  divisions: OrganizerEventAllMatchesDivisionOptionVM[];
  courts?: EventCourtVM[];
  suggestedDivisionId?: string | null;
  onConfirm: (input: {
    divisionId: string;
    defaultCourtId?: string;
  }) => void;
  pending?: boolean;
}) {
  const activeCourts = useMemo(
    () => (courts ?? []).filter((c) => c.isActive),
    [courts],
  );
  const [divisionId, setDivisionId] = useState("");
  const [courtId, setCourtId] = useState("");

  useEffect(() => {
    if (!open) return;
    setDivisionId(suggestedDivisionId ?? divisions[0]?.id ?? "");
    setCourtId(activeCourts[0]?.id ?? "");
  }, [open, suggestedDivisionId, divisions, activeCourts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">경기구분</span>
            <select
              className={cn(formControlFieldCompactClass, "h-10")}
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              aria-label="대상 경기구분"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          {activeCourts.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">
                기본 경기장 (선택)
              </span>
              <select
                className={cn(formControlFieldCompactClass, "h-10")}
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                aria-label="기본 경기장"
              >
                {activeCourts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!divisionId || pending}
            onClick={() =>
              onConfirm({
                divisionId,
                defaultCourtId: courtId || undefined,
              })
            }
          >
            {pending ? "처리 중…" : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
