"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import type { UserRole } from "@/lib/enums";
import { EventAddressInput } from "@/components/domain/events/EventAddressInput";
import { EventCreateForm } from "@/components/domain/events/EventCreateForm";
import { EventPosterUpload } from "@/components/domain/events/EventPosterUpload";
import { Button } from "@/components/ui/button";
import { ORGANIZER_FIELD_INPUT_CLASS } from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";
import { zodFlattenToFieldErrors } from "@/lib/validators/event-form-errors";

function EventFieldError({
  errors,
  field,
}: {
  errors: Record<string, string[]>;
  field: string;
}) {
  const msg = errors[field]?.[0];
  if (!msg) return null;
  return <p className="text-destructive text-xs">{msg}</p>;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

type UpdateOk = ActionResult<{ ok: true }>;

export function EventForm({
  mode,
  actorRole,
  initial,
}: {
  mode: "create" | "edit";
  actorRole: UserRole;
  initial?: OrganizerEventDetailVM;
}) {
  const router = useRouter();
  const [editState, editAction, editPending] = useActionState(
    updateEventAction,
    null as UpdateOk | null,
  );
  const [posterUrlField, setPosterUrlField] = useState<string | null>(
    initial?.posterUrl ?? null,
  );
  const [showAdvancedPosterUrl, setShowAdvancedPosterUrl] = useState(false);

  useEffect(() => {
    if (editState?.ok === true) {
      router.refresh();
    }
  }, [editState, router]);

  if (mode === "create") {
    return <EventCreateForm actorRole={actorRole} />;
  }

  if (!initial) return null;

  const fieldErrors =
    editState?.ok === false
      ? zodFlattenToFieldErrors(editState.error.details)
      : {};

  return (
    <div
      id="setup-basic"
      className="ring-foreground/10 scroll-mt-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
    >
      <h2 className="text-lg font-semibold">기본 정보</h2>
      {editState?.ok === true ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-50">
          기본 정보가 저장되었습니다.
        </p>
      ) : null}
      {editState?.ok === false ? (
        <p className="text-destructive text-sm">{editState.error.message}</p>
      ) : null}
      <form action={editAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="intent" value="basic" />
        <input type="hidden" name="eventId" value={initial.id} />
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">대회명</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={initial.title}
            className={cn(
              ORGANIZER_FIELD_INPUT_CLASS,
            )}
            aria-invalid={Boolean(fieldErrors.title?.[0])}
          />
          <EventFieldError errors={fieldErrors} field="title" />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">설명</span>
          <textarea
            name="description"
            rows={3}
            maxLength={8000}
            defaultValue={initial.description ?? ""}
            className={cn(
              cn(ORGANIZER_FIELD_INPUT_CLASS, "min-h-[72px] py-2"),
            )}
          />
        </label>
        <EventAddressInput
          key={[
            initial.postalCode,
            initial.roadAddress,
            initial.jibunAddress,
            initial.detailAddress,
            initial.locationName,
            initial.location,
          ]
            .map((v) => v ?? "")
            .join("|")}
          initial={{
            postalCode: initial.postalCode,
            roadAddress: initial.roadAddress,
            jibunAddress: initial.jibunAddress,
            detailAddress: initial.detailAddress,
            locationName: initial.locationName,
            location: initial.location,
          }}
          fieldErrors={fieldErrors}
        />
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">대회 일시</span>
          <input
            type="datetime-local"
            name="eventDate"
            required
            defaultValue={toDatetimeLocalValue(initial.eventDate)}
            className={cn(
              ORGANIZER_FIELD_INPUT_CLASS,
            )}
            aria-invalid={Boolean(fieldErrors.eventDate?.[0])}
          />
          <EventFieldError errors={fieldErrors} field="eventDate" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">신청 시작</span>
          <input
            type="datetime-local"
            name="registrationStartDate"
            required
            defaultValue={toDatetimeLocalValue(initial.registrationStartDate)}
            className={cn(
              ORGANIZER_FIELD_INPUT_CLASS,
            )}
            aria-invalid={Boolean(fieldErrors.registrationStartDate?.[0])}
          />
          <EventFieldError errors={fieldErrors} field="registrationStartDate" />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">신청 마감</span>
          <input
            type="datetime-local"
            name="registrationEndDate"
            required
            defaultValue={toDatetimeLocalValue(initial.registrationEndDate)}
            className={cn(
              ORGANIZER_FIELD_INPUT_CLASS,
            )}
            aria-invalid={Boolean(fieldErrors.registrationEndDate?.[0])}
          />
          <EventFieldError errors={fieldErrors} field="registrationEndDate" />
        </label>
        <div id="setup-poster" className="md:col-span-2 scroll-mt-24 space-y-2">
          <EventPosterUpload
            eventId={initial.id}
            posterUrl={initial.posterUrl}
            onPosterUrlChange={setPosterUrlField}
          />
          <input type="hidden" name="posterUrl" value={posterUrlField ?? ""} />
          <button
            type="button"
            className="text-muted-foreground text-xs underline-offset-2 hover:underline"
            onClick={() => setShowAdvancedPosterUrl((v) => !v)}
          >
            {showAdvancedPosterUrl
              ? "고급: URL 직접 입력 숨기기"
              : "고급: URL 직접 입력"}
          </button>
          {showAdvancedPosterUrl ? (
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                포스터 URL (외부 CDN 등)
              </span>
              <input
                maxLength={2000}
                value={posterUrlField ?? ""}
                onChange={(e) =>
                  setPosterUrlField(e.target.value.trim() || null)
                }
                className={cn(
                  ORGANIZER_FIELD_INPUT_CLASS,
                )}
              />
            </label>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={editPending}>
            {editPending ? "저장 중…" : "기본 정보 저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
