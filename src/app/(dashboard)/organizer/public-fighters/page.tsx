import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { OrganizerPublicFightersBoard } from "@/components/domain/public-fighters/OrganizerPublicFightersBoard";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
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
    <>
      <OrganizerDashboardPageHeader
        title="공개 선수"
        description="체육관이 주최자에게 공개를 허용한 선수만 표시됩니다. 선수 개인 연락처·생년월일·보호자 정보는 노출되지 않습니다."
      />

      <OrganizerPublicFightersBoard
        items={items}
        filterOptions={filterOptions}
        loadDetail={loadDetail}
      />
    </>
  );
}
