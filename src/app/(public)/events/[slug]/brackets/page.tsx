import { notFound } from "next/navigation";
import Link from "next/link";
import { BracketType } from "@/lib/enums";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { MatchListView } from "@/components/domain/brackets/MatchListView";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { TournamentBracketView } from "@/components/domain/brackets/TournamentBracketView";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicEventBracketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) {
    notFound();
  }

  const brackets = await bracketService.getPublicBracketsByEventSlug(slug);

  const bracketIds = brackets.map((b) => b.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-6">
      <PublicBracketRealtimeBridge
        eventId={event.id}
        slug={slug}
        bracketIds={bracketIds}
      />
      <header className="space-y-2">
        <Link
          href={`/events/${slug}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          ← 행사 안내
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          공개 대진표
        </h1>
        <p className="text-muted-foreground text-sm">{event.title}</p>
      </header>

      {brackets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          현재 공개된 대진표가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-16">
          {brackets.map((b) =>
            b.type === BracketType.match_list ? (
              <MatchListView key={b.id} bracket={b} />
            ) : (
              <TournamentBracketView key={b.id} bracket={b} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
