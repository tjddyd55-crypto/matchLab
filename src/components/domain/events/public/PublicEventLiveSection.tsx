import type { PublicLiveStreamDTO } from "@/lib/dto/public";
import { PublicSpectatorEmptyState } from "@/components/domain/events/public/PublicSpectatorEmptyState";
import {
  publicEventPageEyebrowClass,
  publicEventPageTitleClass,
} from "@/components/domain/events/public/public-event-ui";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { matchonStatCardClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

function resolveStreamStatus(status: string): "in_progress" | "waiting" | "completed" {
  const normalized = status.toLowerCase();
  if (normalized.includes("live") || normalized.includes("진행")) {
    return "in_progress";
  }
  if (normalized.includes("end") || normalized.includes("종료")) {
    return "completed";
  }
  return "waiting";
}

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
    <div className="flex flex-col gap-8">
      <header className="space-y-1">
        <p className={publicEventPageEyebrowClass}>Live</p>
        <h2 className={cn(publicEventPageTitleClass, "text-xl md:text-2xl")}>
          라이브 안내
        </h2>
        <p className="text-sm text-matchon-text-secondary">{eventTitle}</p>
      </header>

      {!liveStreamingEnabled ? (
        <PublicSpectatorEmptyState
          title="이 대회는 라이브 방송을 사용하지 않습니다"
          description="주최 측에서 라이브 스트리밍을 사용하지 않는 대회입니다."
          tone="info"
        />
      ) : streams.length === 0 ? (
        <PublicSpectatorEmptyState
          title="라이브 방송 준비 중입니다"
          description="방송이 시작되면 이 화면에서 시청할 수 있습니다."
          tone="info"
        />
      ) : (
        <ul className="flex w-full flex-col gap-4">
          {streams.map((s) => (
            <li key={s.id} className={matchonStatCardClass}>
              <div className="mb-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-matchon-text-primary">
                    {s.title}
                  </h3>
                  <MatchonStatusBadge
                    status={resolveStreamStatus(s.status)}
                    label={s.status}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-matchon-text-secondary">
                  {s.platform} ·{" "}
                  {s.streamType === "mat"
                    ? `매트 ${s.matNumber ?? "—"}`
                    : "메인"}
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={s.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: "field" }),
                      "w-full rounded-xl sm:w-auto",
                    )}
                  >
                    시청 링크 열기
                  </a>
                  {s.embedUrl ? (
                    <a
                      href={s.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "field" }),
                        "w-full rounded-xl sm:w-auto",
                      )}
                    >
                      임베드 URL
                    </a>
                  ) : null}
                </div>
                {s.embedUrl ? (
                  <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-matchon-border bg-black/5">
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-matchon-text-secondary">
        스트림 키·자체 송출 서버·YouTube OAuth 연동은 MVP 범위 밖입니다. 공개되는
        것은 시청/임베드 URL뿐입니다.
      </p>
    </div>
  );
}
