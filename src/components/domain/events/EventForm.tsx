"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEventAction, updateEventAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import type { UserRole } from "@/lib/enums";
import { EventAddressInput } from "@/components/domain/events/EventAddressInput";
import { EventPosterUpload } from "@/components/domain/events/EventPosterUpload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function TogglePair({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        className="size-4 rounded border"
      />
      <input type="hidden" name={name} value="off" />
      <span>{label}</span>
    </label>
  );
}

type CreateOk = ActionResult<{ id: string }>;
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
  const [createState, createAction, createPending] = useActionState(
    createEventAction,
    null as CreateOk | null,
  );
  const [editState, editAction, editPending] = useActionState(
    updateEventAction,
    null as UpdateOk | null,
  );

  useEffect(() => {
    if (createState?.ok === true && createState.data.id) {
      router.push(`/organizer/events/${createState.data.id}`);
    }
  }, [createState, router]);

  useEffect(() => {
    if (editState?.ok === true) {
      router.refresh();
    }
  }, [editState, router]);

  if (mode === "create") {
    return (
      <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">새 대회</h2>
        {createState?.ok === false ? (
          <p className="text-destructive text-sm">{createState.error.message}</p>
        ) : null}
        <form action={createAction} className="grid gap-4 md:grid-cols-2">
          {actorRole === "admin" ? (
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">주최자 ID (organizerId)</span>
              <input
                name="organizerId"
                required
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 font-mono text-sm shadow-sm",
                )}
                placeholder="cuid…"
              />
            </label>
          ) : null}
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">대회명</span>
            <input
              name="title"
              required
              maxLength={200}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">설명 (선택)</span>
            <textarea
              name="description"
              rows={3}
              maxLength={8000}
              className={cn(
                "border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
              )}
            />
          </label>
          <EventAddressInput />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">대회 일시</span>
            <input
              type="datetime-local"
              name="eventDate"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">신청 시작</span>
            <input
              type="datetime-local"
              name="registrationStartDate"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">신청 마감</span>
            <input
              type="datetime-local"
              name="registrationEndDate"
              required
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">포스터 URL (선택)</span>
            <input
              name="posterUrl"
              maxLength={2000}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>

          <div className="md:col-span-2 space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">촬영·영상·스트리밍</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <TogglePair name="photoRecordingEnabled" label="사진 촬영 가능" />
              <TogglePair name="videoRecordingEnabled" label="영상 녹화 가능" />
              <TogglePair name="liveStreamingEnabled" label="라이브 스트리밍 사용" />
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">스트리밍 안내 문구 (선택)</span>
              <textarea
                name="streamingNoticeText"
                rows={2}
                maxLength={4000}
                className={cn(
                  "border-input bg-background min-h-[56px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
                )}
              />
            </label>
            <TogglePair
              name="streamingConsentRequired"
              label="신청 시 스트리밍 동의 필요"
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={createPending}>
              {createPending ? "생성 중…" : "대회 생성"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (!initial) return null;

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold">기본 정보</h2>
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
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">설명</span>
          <textarea
            name="description"
            rows={3}
            maxLength={8000}
            defaultValue={initial.description ?? ""}
            className={cn(
              "border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
            )}
          />
        </label>
        <EventAddressInput
          initial={{
            postalCode: initial.postalCode,
            roadAddress: initial.roadAddress,
            jibunAddress: initial.jibunAddress,
            detailAddress: initial.detailAddress,
            locationName: initial.locationName,
            location: initial.location,
          }}
        />
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">대회 일시</span>
          <input
            type="datetime-local"
            name="eventDate"
            required
            defaultValue={toDatetimeLocalValue(initial.eventDate)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">신청 시작</span>
          <input
            type="datetime-local"
            name="registrationStartDate"
            required
            defaultValue={toDatetimeLocalValue(initial.registrationStartDate)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">신청 마감</span>
          <input
            type="datetime-local"
            name="registrationEndDate"
            required
            defaultValue={toDatetimeLocalValue(initial.registrationEndDate)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <div className="md:col-span-2 space-y-2">
          <EventPosterUpload
            eventId={initial.id}
            posterUrl={initial.posterUrl}
          />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">
              포스터 URL (직접 입력·외부 CDN 등)
            </span>
            <input
              name="posterUrl"
              maxLength={2000}
              defaultValue={initial.posterUrl ?? ""}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
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
