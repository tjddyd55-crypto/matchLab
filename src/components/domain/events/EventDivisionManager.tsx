"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEventDivisionAction,
  updateEventDivisionAction,
} from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { EventStatus } from "@/lib/enums";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import type { DivisionTemplateListItemVM } from "@/lib/services/division-template.service";
import { ApplyDivisionTemplateButton } from "@/components/domain/division-templates/ApplyDivisionTemplateButton";
import { EventDivisionForm } from "@/components/domain/events/EventDivisionForm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Div = OrganizerEventDetailVM["divisions"][number];

function DivisionRowEditor({ d }: { d: Div }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="divisionId" value={d.id} />
      {state?.ok === false ? (
        <p className="text-destructive text-xs sm:col-span-2 lg:col-span-3">
          {state.error.message}
        </p>
      ) : null}
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">종목·부문</span>
        <input
          name="sportType"
          required
          defaultValue={d.sportType}
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">룰</span>
        <input
          name="ruleType"
          defaultValue={d.ruleType ?? ""}
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">성별</span>
        <input
          name="gender"
          defaultValue={d.gender ?? ""}
          maxLength={80}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">연령</span>
        <input
          name="ageGroup"
          defaultValue={d.ageGroup ?? ""}
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">체급</span>
        <input
          name="weightClass"
          defaultValue={d.weightClass ?? ""}
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">실력</span>
        <input
          name="skillLevel"
          defaultValue={d.skillLevel ?? ""}
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
          )}
        />
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "저장 중…" : "부문 저장"}
        </Button>
      </div>
    </form>
  );
}

function DivisionDeleteButton({
  eventId,
  divisionId,
}: {
  eventId: string;
  divisionId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    deleteEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "이 부문을 삭제할까요? 신청·대진표가 연결된 부문은 삭제되지 않습니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="divisionId" value={divisionId} />
      {state?.ok === false ? (
        <p className="text-destructive mb-1 text-xs">{state.error.message}</p>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        삭제
      </Button>
    </form>
  );
}

export function EventDivisionManager({
  eventId,
  status,
  divisions,
  templates,
}: {
  eventId: string;
  status: EventStatus;
  divisions: OrganizerEventDetailVM["divisions"];
  templates: DivisionTemplateListItemVM[];
}) {
  return (
    <section className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">부문 (디비전)</h2>
        {status === EventStatus.open ? (
          <p className="text-muted-foreground text-xs">
            신청 공개 중에는 마지막 부문을 삭제할 수 없습니다.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {divisions.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-3 sm:flex-row sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <DivisionRowEditor d={d} />
            </div>
            <div className="flex shrink-0 justify-end sm:flex-col sm:items-end">
              <DivisionDeleteButton eventId={eventId} divisionId={d.id} />
            </div>
          </div>
        ))}
      </div>

      <ApplyDivisionTemplateButton
        eventId={eventId}
        templates={templates.map((t) => ({ id: t.id, title: t.title }))}
      />

      <EventDivisionForm eventId={eventId} />
    </section>
  );
}
