import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { OrganizerPublicFightersBoard } from "@/components/domain/public-fighters/OrganizerPublicFightersBoard";
import { publicFighterService } from "@/lib/services/public-fighter.service";
export const dynamic = "force-dynamic";

export default async function OrganizerPublicFightersPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);

  const { items, filterOptions } =
    await publicFighterService.listPublicFightersForOrganizer(actor, {});

  async function loadDetail(fighterId: string) {
    "use server";
    const actorInner = await requireActor();
    redirectUnlessDashboardRole(actorInner, ["organizer", "admin"]);
    return publicFighterService.getPublicFighterDetail(actorInner, fighterId);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          공개 선수
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          체육관이 주최자에게 공개를 허용한 선수만 표시됩니다. 선수 개인
          연락처·생년월일·보호자 정보는 노출되지 않습니다.
        </p>
      </div>

      <OrganizerPublicFightersBoard
        items={items}
        filterOptions={filterOptions}
        loadDetail={loadDetail}
      />
    </div>
  );
}
