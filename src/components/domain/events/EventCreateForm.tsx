"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "@/features/events/actions";
import { EventAddressInput } from "@/components/domain/events/EventAddressInput";
import { putFileToEventSignedUploadUrl } from "@/lib/client/event-image-storage-upload";
import { EVENT_IMAGE_MAX_BYTES } from "@/lib/constants/event-image-upload";
import type { ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/lib/enums";
import {
  finalizeEventPosterUploadAction,
  requestEventPosterUploadAction,
} from "@/features/event-images/actions";
import { EventPosterOrganizerPreview } from "@/components/domain/events/EventPosterOrganizerPreview";
import {
  EventPosterAspectWarningBox,
  EventPosterUploadGuide,
} from "@/components/domain/events/EventPosterUploadGuide";
import { stashPosterUploadFlashMessage } from "@/components/domain/events/OrganizerEventFlashBanner";
import {
  getEventPosterAspectWarning,
  readImageDimensionsFromFile,
} from "@/lib/client/event-poster-aspect";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreateOk = ActionResult<{ id: string }>;

const ALLOWED_POSTER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

export function EventCreateForm({ actorRole }: { actorRole: UserRole }) {
  const router = useRouter();
  const posterInputRef = useRef<HTMLInputElement>(null);
  const posterPreviewRef = useRef<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [posterAspectWarning, setPosterAspectWarning] = useState<string | null>(
    null,
  );
  const [posterError, setPosterError] = useState<string | null>(null);
  const [uploadingPoster, startPosterUpload] = useTransition();
  const [createState, createAction, createPending] = useActionState(
    createEventAction,
    null as CreateOk | null,
  );
  const handledCreateIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (posterPreviewRef.current) {
        URL.revokeObjectURL(posterPreviewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (createState?.ok !== true || !createState.data.id) return;

    const eventId = createState.data.id;
    if (handledCreateIdRef.current === eventId) return;
    handledCreateIdRef.current = eventId;

    if (!posterFile) {
      router.push(`/organizer/events/${eventId}`);
      return;
    }

    startPosterUpload(async () => {
      setPosterError(null);
      const mimeType = posterFile.type;
      const issueFd = new FormData();
      issueFd.set("eventId", eventId);
      issueFd.set("mimeType", mimeType);
      const issue = await requestEventPosterUploadAction(issueFd);
      if (!issue.ok) {
        const msg = issue.error.message;
        setPosterError(msg);
        stashPosterUploadFlashMessage(
          `${msg} 대회는 생성되었습니다. 상세 화면에서 포스터를 다시 업로드해 주세요.`,
        );
        router.push(`/organizer/events/${eventId}`);
        return;
      }

      const put = await putFileToEventSignedUploadUrl(
        issue.data.uploadUrl,
        posterFile,
      );
      if (!put.ok) {
        const msg = `포스터 업로드에 실패했습니다 (${put.status}). 대회는 생성되었습니다. 상세 화면에서 다시 업로드해 주세요.`;
        setPosterError(msg);
        stashPosterUploadFlashMessage(msg);
        router.push(`/organizer/events/${eventId}`);
        return;
      }

      const finFd = new FormData();
      finFd.set("eventId", eventId);
      finFd.set("path", issue.data.path);
      const fin = await finalizeEventPosterUploadAction(finFd);
      if (!fin.ok) {
        const msg = fin.error.message;
        setPosterError(msg);
        stashPosterUploadFlashMessage(
          `${msg} 대회는 생성되었습니다. 상세 화면에서 포스터를 다시 업로드해 주세요.`,
        );
      }
      router.push(`/organizer/events/${eventId}`);
    });
  }, [createState, posterFile, router]);

  function revokePosterPreview() {
    if (posterPreviewRef.current) {
      URL.revokeObjectURL(posterPreviewRef.current);
      posterPreviewRef.current = null;
    }
    setPosterPreviewUrl(null);
  }

  async function onPosterPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPosterError(null);
    if (!file) {
      revokePosterPreview();
      setPosterAspectWarning(null);
      setPosterFile(null);
      return;
    }
    if (!ALLOWED_POSTER_MIME.has(file.type)) {
      setPosterError("JPEG, PNG, WebP 이미지만 선택할 수 있습니다.");
      revokePosterPreview();
      setPosterAspectWarning(null);
      setPosterFile(null);
      return;
    }
    if (file.size > EVENT_IMAGE_MAX_BYTES) {
      setPosterError(
        `파일 크기는 ${Math.round(EVENT_IMAGE_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`,
      );
      revokePosterPreview();
      setPosterAspectWarning(null);
      setPosterFile(null);
      return;
    }

    revokePosterPreview();
    const url = URL.createObjectURL(file);
    posterPreviewRef.current = url;
    setPosterPreviewUrl(url);
    setPosterFile(file);

    try {
      const { width, height } = await readImageDimensionsFromFile(file);
      setPosterAspectWarning(getEventPosterAspectWarning(width, height));
    } catch {
      setPosterAspectWarning(null);
    }
  }

  function clearPosterSelection() {
    revokePosterPreview();
    setPosterAspectWarning(null);
    setPosterFile(null);
    setPosterError(null);
  }

  const busy = createPending || uploadingPoster;

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold">새 대회</h2>
      {createState?.ok === false ? (
        <p className="text-destructive text-sm">{createState.error.message}</p>
      ) : null}
      {posterError ? (
        <p className="text-destructive text-sm" role="alert">
          {posterError}
        </p>
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

        <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
          <EventPosterUploadGuide
            title="포스터 이미지 (선택)"
            footerNote="대회 생성 직후 자동 업로드됩니다."
          />
          {posterAspectWarning ? (
            <EventPosterAspectWarningBox message={posterAspectWarning} />
          ) : null}
          <input
            ref={posterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPosterPick}
          />
          <div className="flex flex-wrap items-start gap-4">
            <EventPosterOrganizerPreview src={posterPreviewUrl} />
            <div className="flex min-w-[140px] flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => posterInputRef.current?.click()}
              >
                {posterFile ? "다른 파일 선택" : "포스터 선택"}
              </Button>
              {posterFile ? (
                <span className="text-muted-foreground text-xs">
                  {posterFile.name} ({Math.round(posterFile.size / 1024)} KB)
                </span>
              ) : null}
              {posterFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={clearPosterSelection}
                >
                  선택 취소
                </Button>
              ) : null}
            </div>
          </div>
        </div>

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
          <Button type="submit" disabled={busy}>
            {busy
              ? uploadingPoster
                ? "포스터 업로드 중…"
                : "생성 중…"
              : "대회 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
