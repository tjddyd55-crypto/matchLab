"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateEventAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function EventRecordingStreamingSettings({
  event,
}: {
  event: OrganizerEventDetailVM;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateEventAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold">촬영·영상·스트리밍</h2>
      <p className="text-muted-foreground text-sm">
        스트림 키·자체 스트리밍 서버·YouTube OAuth 연동은 저장하지 않습니다.
      </p>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="intent" value="recording" />
        <input type="hidden" name="eventId" value={event.id} />
        <div className="grid gap-2 sm:grid-cols-2">
          <TogglePair
            name="photoRecordingEnabled"
            label="사진 촬영 가능"
            defaultChecked={event.photoRecordingEnabled}
          />
          <TogglePair
            name="videoRecordingEnabled"
            label="영상 녹화 가능"
            defaultChecked={event.videoRecordingEnabled}
          />
          <TogglePair
            name="liveStreamingEnabled"
            label="라이브 스트리밍 사용"
            defaultChecked={event.liveStreamingEnabled}
          />
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">스트리밍 안내 문구</span>
          <textarea
            name="streamingNoticeText"
            rows={3}
            maxLength={4000}
            defaultValue={event.streamingNoticeText ?? ""}
            className={cn(
              "border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
            )}
          />
        </label>
        <TogglePair
          name="streamingConsentRequired"
          label="신청 시 스트리밍 동의 필요"
          defaultChecked={event.streamingConsentRequired}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "설정 저장"}
        </Button>
      </form>
    </div>
  );
}
