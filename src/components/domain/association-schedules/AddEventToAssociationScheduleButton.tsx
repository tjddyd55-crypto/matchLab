"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AssociationScheduleFormDialog,
  type AssociationScheduleFormPrefill,
} from "@/components/domain/association-schedules/AssociationScheduleFormDialog";
import {
  getEventSchedulePrefillAction,
} from "@/features/association-schedules/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormOption = { id: string; title: string; status: string };
type NoticeOption = { id: string; title: string };

export function AddEventToAssociationScheduleButton({
  eventId,
  eventTitle,
  linkedScheduleId,
  linkedScheduleDateKey,
  formOptions,
  noticeOptions,
  compact = false,
}: {
  eventId: string;
  eventTitle: string;
  linkedScheduleId?: string | null;
  linkedScheduleDateKey?: string | null;
  formOptions: FormOption[];
  noticeOptions: NoticeOption[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<AssociationScheduleFormPrefill | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [savedScheduleId, setSavedScheduleId] = useState<string | null>(
    linkedScheduleId ?? null,
  );
  const [savedDateKey, setSavedDateKey] = useState<string | null>(
    linkedScheduleDateKey ?? null,
  );

  const scheduleHref =
    savedScheduleId && savedDateKey
      ? `/organizer/schedules?date=${savedDateKey}`
      : "/organizer/schedules";

  function openCreateDialog() {
    setMessage(null);
    startTransition(async () => {
      const result = await getEventSchedulePrefillAction(eventId);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setPrefill({
        ...result.data.prefill,
        relatedEventTitle: eventTitle,
      });
      setOpen(true);
    });
  }

  if (savedScheduleId) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Link
          href={scheduleHref}
          className={cn(
            buttonVariants({ size: "sm", variant: "secondary" }),
            compact ? "h-8 min-w-[3.25rem] px-2 text-xs" : "h-8 px-2.5 text-xs",
          )}
        >
          일정 보기
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={openCreateDialog}
          className={cn(
            buttonVariants({ size: "sm", variant: "secondary" }),
            compact ? "h-8 min-w-[3.25rem] px-2 text-xs" : "h-8 px-2.5 text-xs",
          )}
        >
          {pending ? "…" : "일정 추가"}
        </button>
        {message ? (
          <span className="text-destructive max-w-[8rem] text-center text-[10px] leading-tight">
            {message}
          </span>
        ) : null}
      </div>
      <AssociationScheduleFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultDateKey={prefill?.startsAtDate ?? new Date().toISOString().slice(0, 10)}
        schedule={null}
        prefill={prefill}
        formOptions={formOptions}
        noticeOptions={noticeOptions}
        onSaved={({ scheduleId }) => {
          setSavedScheduleId(scheduleId);
          setSavedDateKey(prefill?.startsAtDate ?? null);
          setMessage("협회 일정에 추가했습니다.");
          router.refresh();
        }}
      />
    </>
  );
}
