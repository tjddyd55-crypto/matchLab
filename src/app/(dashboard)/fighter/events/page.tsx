import { FighterEventsBoard } from "@/components/domain/fighter-events/FighterEventsBoard";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import { fighterEventStatusService } from "@/lib/services/fighter-event-status.service";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterEventsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["fighter", "admin"]);
  await requireFighterDashboardReady(actor);

  const data = await fighterEventStatusService.getFighterEventsPage(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-3xl")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>내 대회·내 경기</h1>
          <p className={matchonPageDescClass}>
            체육관이 제출한 대회 신청과 현장·대진·경기 상태를 확인할 수 있습니다.
            정보 수정은 체육관 또는 주최자가 진행합니다.
          </p>
        </header>

        <FighterEventsBoard data={data} />
      </div>
    </div>
  );
}
