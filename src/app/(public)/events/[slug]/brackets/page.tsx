import { notFound } from "next/navigation";
import { BracketType } from "@/lib/enums";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { MatchListView } from "@/components/domain/brackets/MatchListView";
import { PublicBracketRealtimeBridge } from "@/components/domain/brackets/PublicBracketRealtimeBridge";
import { TournamentBracketView } from "@/components/domain/brackets/TournamentBracketView";
import { PUBLIC_EVENT_DETAIL_PAGE_CLASS } from "@/components/domain/events/public/public-event-layout";
import { PublicEventSubpageHeader } from "@/components/domain/events/public/PublicEventSubpageHeader";

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
    <main className={PUBLIC_EVENT_DETAIL_PAGE_CLASS}>
      <PublicBracketRealtimeBridge
        eventId={event.id}
        slug={slug}
        bracketIds={bracketIds}
      />
      <PublicEventSubpageHeader
        slug={slug}
        title="공개 대진표"
        eventTitle={event.title}
      />

      {brackets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          현재 공개된 대진표가 없습니다.
        </p>
      ) : (
        <div className="flex w-full flex-col gap-16">
          {brackets.map((b) =>
            b.type === BracketType.match_list ? (
              <MatchListView key={b.id} bracket={b} />
            ) : (
              <TournamentBracketView key={b.id} bracket={b} />
            ),
          )}
        </div>
      )}
    </main>
  );
}
