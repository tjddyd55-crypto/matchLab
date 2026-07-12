import type { PublicLiveStreamDTO } from "@/lib/dto/public";
import { PublicSpectatorEmptyState } from "@/components/domain/events/public/PublicSpectatorEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex flex-col gap-8">
      <Card variant="muted" className="py-4">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">라이브 안내</CardTitle>
          <CardDescription>{eventTitle}</CardDescription>
        </CardHeader>
      </Card>

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
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>
                  {s.platform} ·{" "}
                  {s.streamType === "mat"
                    ? `매트 ${s.matNumber ?? "—"}`
                    : "메인"}{" "}
                  · {s.status}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={s.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: "field" }), "w-full sm:w-auto")}
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
                        "w-full sm:w-auto",
                      )}
                    >
                      임베드 URL
                    </a>
                  ) : null}
                </div>
                {s.embedUrl ? (
                  <div className="w-full max-w-3xl overflow-hidden rounded-lg border bg-black/5">
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
              </CardContent>
            </Card>
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
