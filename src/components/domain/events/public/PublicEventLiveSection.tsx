import { EmptyState } from "@/components/shared/EmptyState";
import type { PublicLiveStreamDTO } from "@/lib/dto/public";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventLiveSection({
  eventTitle,
  streams,
  liveStreamingEnabled = true,
}: {
  eventTitle: string;
  streams: PublicLiveStreamDTO[];
  liveStreamingEnabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
          라이브 안내
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{eventTitle}</p>
      </div>

      {!liveStreamingEnabled ? (
        <EmptyState
          title="이 대회는 라이브 방송을 사용하지 않습니다."
          description="주최 측에서 라이브 스트리밍을 사용하지 않는 대회입니다."
        />
      ) : streams.length === 0 ? (
        <EmptyState
          title="라이브 방송 준비 중입니다."
          description="방송이 시작되면 이 화면에서 시청할 수 있습니다."
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
                  <h3 className="font-medium">{s.title}</h3>
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
    </div>
  );
}
