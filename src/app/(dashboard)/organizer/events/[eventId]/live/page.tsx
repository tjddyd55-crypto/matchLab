import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { resolveOrganizerEventPageError } from "@/lib/permissions";
import { eventService } from "@/lib/services/event.service";
import { liveStreamService } from "@/lib/services/live-stream.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventLivePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  let detail;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const streams = await liveStreamService.listForOrganizerEvent(actor, eventId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">라이브 URL</h1>
        <p className="text-muted-foreground text-sm">
          시드 또는 DB에 등록된 송출 링크를 확인합니다. URL 편집 UI는{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            liveStreamService.upsertStreams
          </code>{" "}
          연결 시 제공 예정입니다.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/events/${detail.publicSlug}/live`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          target="_blank"
          rel="noreferrer"
        >
          공개 라이브 페이지
        </Link>
        <Link
          href={`/organizer/events/${eventId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          대회 관리로
        </Link>
      </div>

      {streams.length === 0 ? (
        <EmptyState
          title="등록된 라이브 행이 없습니다"
          description="시드 데이터가 있으면 여기에 표시됩니다. 운영 URL 등록 기능은 추후 제공 예정입니다."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {streams.map((s) => (
            <li
              key={s.id}
              className="ring-foreground/10 rounded-lg border bg-card p-4 text-sm shadow-sm"
            >
              <div className="font-medium">{s.title}</div>
              <p className="text-muted-foreground mt-1 text-xs">
                {s.platform} · {s.streamType} · 공개 {s.isPublic ? "예" : "아니오"} · {s.status}
              </p>
              {s.watchUrl ? (
                <p className="mt-2 break-all font-mono text-xs">{s.watchUrl}</p>
              ) : (
                <p className="text-muted-foreground mt-2 text-xs">watch URL 없음</p>
              )}
              {s.embedUrl ? (
                <p className="mt-1 break-all font-mono text-xs">{s.embedUrl}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
