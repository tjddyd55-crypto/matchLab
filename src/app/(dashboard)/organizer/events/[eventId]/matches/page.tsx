import Link from "next/link";
import { OrganizerMatchesBoard } from "@/components/domain/brackets/OrganizerMatchesBoard";
import { OrganizerMatchesRealtimeBridge } from "@/components/domain/matches/OrganizerMatchesRealtimeBridge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { matchService } from "@/lib/services/match.service";

export const dynamic = "force-dynamic";

export default async function OrganizerEventMatchesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEvent(actor, eventId);

  const matches = await matchService.listOrganizerEventMatches(actor, eventId);
  const eventTitle = matches[0]?.eventTitle ?? "행사";
  const bracketIds = [...new Set(matches.map((m) => m.bracketId))];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <OrganizerMatchesRealtimeBridge
        eventId={eventId}
        bracketIds={bracketIds}
        organizerId={actor.organizerId ?? null}
      />
      <div>
        <Link
          href={`/organizer/events/${eventId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 mb-2",
          )}
        >
          ← 행사 상세
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          경기 운영 · {eventTitle}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
          경기 상태 변경과 결과 임시 입력은 MatchResult를 만들지 않습니다. 공식
          전적은 결과 확정 후에만 반영되며, 단판 토너먼트에서는 승자가 다음 슬롯으로
          배치됩니다.
        </p>
      </div>

      <OrganizerMatchesBoard matches={matches} />
    </div>
  );
}
