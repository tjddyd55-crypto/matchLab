import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";
import { requireActor } from "@/lib/auth/actor";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterPendingPage() {
  const actor = await requireActor();
  const gate = await fighterAccountService.getFighterRegistrationGate(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-lg")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>체육관 승인 대기</h1>
        </header>
        <FighterDashboardEmptyState
          title={
            gate.kind === "pending"
              ? `${gate.gymName}에 등록 요청이 접수되었습니다`
              : "등록 요청 상태를 확인할 수 없습니다"
          }
          description={
            gate.kind === "pending"
              ? "체육관에서 승인하면 대시보드를 이용할 수 있습니다."
              : "잠시 후 다시 시도하거나 소속 체육관에 문의해 주세요."
          }
          tone={gate.kind === "pending" ? "info" : "warning"}
        />
      </div>
    </div>
  );
}
