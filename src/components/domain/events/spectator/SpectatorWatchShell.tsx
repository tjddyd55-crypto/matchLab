import { Suspense, type ReactNode } from "react";
import { SpectatorBottomTabs } from "@/components/domain/events/spectator/SpectatorBottomTabs";
import { SpectatorWatchHeader } from "@/components/domain/events/spectator/SpectatorWatchHeader";
import type { PublicEventDetailDTO } from "@/lib/dto/public";
import type { SpectatorWatchTabId } from "@/lib/public-event-watch";

export function SpectatorWatchShell({
  event,
  slug,
  activeTab,
  children,
}: {
  event: PublicEventDetailDTO;
  slug: string;
  activeTab: SpectatorWatchTabId;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background">
      <SpectatorWatchHeader event={event} activeTab={activeTab} />
      <div className="flex-1 px-4 py-4 pb-28">{children}</div>
      <Suspense fallback={null}>
        <SpectatorBottomTabs
          slug={slug}
          activeTab={activeTab}
          showLive={event.liveStreamingEnabled}
        />
      </Suspense>
    </div>
  );
}
