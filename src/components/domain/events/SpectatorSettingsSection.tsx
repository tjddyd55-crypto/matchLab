import { updateSpectatorAccessAction } from "@/features/events/actions";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { Button, buttonVariants } from "@/components/ui/button";
import { EventSpectatorQr } from "@/components/domain/events/EventSpectatorQr";
import {
  formControlCheckboxRowClass,
  formControlFieldClass,
  formControlFieldStackClass,
  formControlFormGapClass,
  formControlLabelMutedClass,
  formControlSaveButtonClass,
} from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buildEventBracketQrUrl } from "@/lib/qr-url";

function ToggleHidden({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <>
      <input
        type="checkbox"
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        className="size-4"
      />
      <input type="hidden" name={name} value="off" />
    </>
  );
}

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export function SpectatorSettingsSection({
  detail,
  baseUrl,
}: {
  detail: OrganizerEventDetailVM;
  baseUrl: string;
}) {
  const bracketUrl = buildEventBracketQrUrl(detail.publicSlug, baseUrl);

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <h2 className="text-lg font-semibold">관람 공개 기간 · QR</h2>
      <p className="text-muted-foreground text-sm">
        켜두면 대진표·라이브·결과 공개 페이지가 설정한 시간에만 열립니다. 꺼두면
        기존처럼 상시 공개입니다. URL 유출에 유의해 주세요.
      </p>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <form
          action={async (formData) => {
            "use server";
            await updateSpectatorAccessAction(formData);
          }}
          className={cn(
            "max-w-md flex-1 flex flex-col",
            formControlFormGapClass,
          )}
        >
          <input type="hidden" name="eventId" value={detail.id} />
          <label className={formControlCheckboxRowClass}>
            <ToggleHidden
              name="spectatorAccessEnabled"
              defaultChecked={detail.spectatorAccessEnabled}
            />
            관람 페이지 시간 제한 사용
          </label>
          <label className={formControlFieldStackClass}>
            <span className={formControlLabelMutedClass}>관람 시작</span>
            <input
              type="datetime-local"
              name="spectatorAccessStartAt"
              defaultValue={toLocal(detail.spectatorAccessStartAt)}
              className={formControlFieldClass}
            />
          </label>
          <label className={formControlFieldStackClass}>
            <span className={formControlLabelMutedClass}>관람 종료</span>
            <input
              type="datetime-local"
              name="spectatorAccessEndAt"
              defaultValue={toLocal(detail.spectatorAccessEndAt)}
              className={formControlFieldClass}
            />
          </label>
          <div>
            <Button
              type="submit"
              size="default"
              className={formControlSaveButtonClass}
            >
              관람 설정 저장
            </Button>
          </div>
          {detail.spectatorAccessToken ? (
            <p className="text-muted-foreground font-mono text-[11px] break-all">
              관람 토큰(참고): {detail.spectatorAccessToken}
            </p>
          ) : null}
        </form>

        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground text-center text-xs">
            공개 대진표 링크 (Railway 배포 시 NEXT_PUBLIC_APP_URL 권장)
          </p>
          <code className="bg-muted max-w-[280px] break-all rounded px-2 py-1 text-[11px]">
            {bracketUrl}
          </code>
          <EventSpectatorQr url={bracketUrl} />
          <Link
            href={`/organizer/events/${detail.id}/qr`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            관람객 QR 출력
          </Link>
        </div>
      </div>
    </div>
  );
}
