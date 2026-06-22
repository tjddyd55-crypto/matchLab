"use client";

import { useState } from "react";
import type { PublicLiveStreamDTO } from "@/lib/dto/public";
import { buttonVariants } from "@/components/ui/button";
import { SpectatorWatchEmptyState } from "@/components/domain/events/spectator/SpectatorWatchEmptyState";
import {
  spectatorLiveStatusBadgeClass,
  spectatorLiveStatusLabel,
} from "@/components/domain/events/spectator/spectator-status-labels";
import { cn } from "@/lib/utils";

function isEmbeddableUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtube-nocookie.com") ||
      host.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

function LiveStreamCard({ stream }: { stream: PublicLiveStreamDTO }) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const canEmbed = isEmbeddableUrl(stream.embedUrl) && !embedFailed;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="space-y-2 border-b bg-muted/20 px-4 py-3">
        <h3 className="text-base font-semibold">{stream.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full border",
              spectatorLiveStatusBadgeClass(stream.status),
            )}
          >
            {spectatorLiveStatusLabel(stream.status)}
          </span>
          <span className="text-muted-foreground">
            {stream.streamType === "mat"
              ? `매트 ${stream.matNumber ?? "—"}`
              : "메인 방송"}
          </span>
        </div>
      </div>

      {canEmbed && stream.embedUrl ? (
        <div className="bg-black">
          <div className="aspect-video w-full">
            <iframe
              title={`${stream.title} 라이브`}
              src={stream.embedUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              onError={() => setEmbedFailed(true)}
            />
          </div>
        </div>
      ) : null}

      <div className="px-4 py-4">
        <a
          href={stream.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ className: "w-full" }))}
        >
          라이브 방송 보기
        </a>
      </div>
    </article>
  );
}

export function SpectatorLiveTab({
  streams,
  liveStreamingEnabled,
}: {
  streams: PublicLiveStreamDTO[];
  liveStreamingEnabled: boolean;
}) {
  if (!liveStreamingEnabled) {
    return (
      <SpectatorWatchEmptyState
        title="라이브 방송이 준비되지 않았습니다."
        description="주최자가 방송 링크를 등록하면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  if (streams.length === 0) {
    return (
      <SpectatorWatchEmptyState
        title="아직 라이브 방송이 준비되지 않았습니다."
        description="주최자가 방송 링크를 등록하면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      {streams.map((stream) => (
        <LiveStreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}
