import Link from "next/link";
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
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {copy.title}
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {title} — {copy.description}
      </p>
      <p className="text-muted-foreground text-xs">
        대회 안내(행사 개요·오시는 길)는 계속 볼 수 있습니다.
      </p>
      <Link
        href={`/events/${slug}`}
        className={cn(buttonVariants({ variant: "secondary" }), "mx-auto")}
      >
        대회 안내로 돌아가기
      </Link>
    </div>
  );
}
