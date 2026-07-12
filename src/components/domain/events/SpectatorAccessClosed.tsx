import Link from "next/link";
import { PublicSpectatorEmptyState } from "@/components/domain/events/public/PublicSpectatorEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  spectatorAccessStateMessage,
  type SpectatorAccessState,
} from "@/lib/spectator-access";
import { cn } from "@/lib/utils";

export function SpectatorAccessClosed({
  slug,
  title,
  state = "misconfigured",
}: {
  slug: string;
  title: string;
  state?: SpectatorAccessState;
}) {
  const copy = spectatorAccessStateMessage(state);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-16">
      <PublicSpectatorEmptyState
        title={copy.title}
        description={`${title} — ${copy.description}`}
        tone="warning"
        action={
          <div className="space-y-3 text-center">
            <p className="text-muted-foreground text-xs">
              대회 안내(행사 개요·오시는 길)는 계속 볼 수 있습니다.
            </p>
            <Link
              href={`/events/${slug}`}
              className={cn(buttonVariants({ variant: "outline", size: "field" }), "inline-flex")}
            >
              대회 안내로 돌아가기
            </Link>
          </div>
        }
      />
    </div>
  );
}
