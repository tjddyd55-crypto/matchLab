import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { PublicEventSubpageHeader } from "@/components/domain/events/public/PublicEventSubpageHeader";
import { eventService } from "@/lib/services/event.service";
import { liveStreamService } from "@/lib/services/live-stream.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicEventLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  const streams = await liveStreamService.listPublicForEventSlug(slug);

  return (
    <main className={PUBLIC_EVENT_DETAIL_PAGE_CLASS}>
      <PublicEventSubpageHeader
        slug={slug}
        title="라이브 안내"
        eventTitle={event.title}
      />

      {streams.length === 0 ? (
        <EmptyState
          title="공개된 라이브 링크가 없습니다"
          description="주최측에서 공개·URL이 등록되면 이 페이지에 표시됩니다. (시연 시드에는 샘플 링크가 포함될 수 있습니다.)"
        />
      ) : (
        <ul className="flex w-full flex-col gap-4">
          {streams.map((s) => (
            <li
              key={s.id}
              className="ring-foreground/10 w-full rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{s.title}</h2>
                  <p className="text-muted-foreground text-xs">
                    {s.platform} ·{" "}
                    {s.streamType === "mat"
                      ? `매트 ${s.matNumber ?? "—"}`
                      : "메인"}{" "}
                    · {s.status}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={s.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  시청 링크 열기
                </a>
                {s.embedUrl ? (
                  <a
                    href={s.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    임베드 URL
                  </a>
                ) : null}
              </div>
              {s.embedUrl ? (
                <div className="mt-4 w-full max-w-3xl overflow-hidden rounded-md border bg-black/5">
                  <div className="aspect-video w-full">
                    <iframe
                      title={`${s.title} 라이브`}
                      src={s.embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs leading-relaxed">
        스트림 키·자체 송출 서버·YouTube OAuth 연동은 MVP 범위 밖입니다. 공개되는
        것은 시청/임베드 URL뿐입니다.
      </p>
    </main>
  );
}
