import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { BracketCreateForm } from "@/components/domain/brackets/BracketCreateForm";
import { OrganizerBracketList } from "@/components/domain/brackets/OrganizerBracketList";

export const dynamic = "force-dynamic";

export default async function OrganizerEventBracketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [brackets, divisions] = await Promise.all([
    bracketService.listOrganizerEventBrackets(actor, eventId),
    eventService.listOrganizerEventDivisions(actor, eventId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          대진표 관리
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          브래킷 타입은 단위별로 지정되며, 같은 대회에서 토너먼트와 경기 목록을 함께 둘 수
          있습니다.
        </p>
      </div>

      <BracketCreateForm eventId={eventId} divisions={divisions} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">브래킷 목록</h2>
        {brackets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 생성된 대진표가 없습니다.
          </p>
        ) : (
          <OrganizerBracketList eventId={eventId} brackets={brackets} />
        )}
      </div>
    </div>
  );
}
