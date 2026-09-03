"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createManualGymAttendanceAction } from "@/features/gym-attendance/actions";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export function GymMemberManualAttendanceDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setNote("");
    }
    onOpenChange(next);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("gymMemberId", memberId);
      if (note.trim()) fd.set("note", note.trim());
      const res = await createManualGymAttendanceAction(fd);
      if (!res.ok) {
        setError(res.error?.message ?? "출석 등록에 실패했습니다.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="border-b border-matchon-border px-4 py-3">
          <DialogTitle className="text-base">출석 처리</DialogTitle>
          <DialogDescription className="text-xs">
            {memberName} · 지금 시각으로 수동 출석을 기록합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-4 py-3">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <label className="block text-xs text-matchon-text-secondary">
            메모 (선택)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={matchonFieldInputClass + " mt-1"}
              placeholder="예: 방문 출석"
            />
          </label>
        </div>
        <DialogFooter className="border-t border-matchon-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={submit}>
            출석 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
