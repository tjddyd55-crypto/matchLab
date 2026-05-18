import { updateSpectatorAccessAction } from "@/features/events/actions";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { Button } from "@/components/ui/button";
import { EventSpectatorQr } from "@/components/domain/events/EventSpectatorQr";
import { cn } from "@/lib/utils";

function ToggleHidden({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <>
      <input type="checkbox" name={name} value="on" defaultChecked={defaultChecked} className="size-4" />
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
}: {
  detail: OrganizerEventDetailVM;
}) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "";
  const bracketUrl = base
    ? `${base}/events/${detail.publicSlug}/brackets`
    : `/events/${detail.publicSlug}/brackets`;

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
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
          className="max-w-md flex-1 space-y-3"
        >
          <input type="hidden" name="eventId" value={detail.id} />
          <label className="flex items-center gap-2 text-sm">
            <ToggleHidden
              name="spectatorAccessEnabled"
              defaultChecked={detail.spectatorAccessEnabled}
            />
            관람 페이지 시간 제한 사용
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">관람 시작</span>
            <input
              type="datetime-local"
              name="spectatorAccessStartAt"
              defaultValue={toLocal(detail.spectatorAccessStartAt)}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">관람 종료</span>
            <input
              type="datetime-local"
              name="spectatorAccessEndAt"
              defaultValue={toLocal(detail.spectatorAccessEndAt)}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>
          <Button type="submit" size="sm">
            관람 설정 저장
          </Button>
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
          {base ? <EventSpectatorQr url={bracketUrl} /> : null}
        </div>
      </div>
    </div>
  );
}
