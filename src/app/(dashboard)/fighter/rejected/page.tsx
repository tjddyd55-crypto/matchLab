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

export default async function FighterRejectedPage() {
  const actor = await requireActor();
  const gate = await fighterAccountService.getFighterRegistrationGate(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-lg")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>등록 요청 반려</h1>
        </header>
        <FighterDashboardEmptyState
          title={
            gate.kind === "rejected"
              ? `${gate.gymName}에서 등록 요청이 반려되었습니다`
              : "등록 상태를 확인할 수 없습니다"
          }
          description={
            gate.kind === "rejected"
              ? "체육관에 문의해 주세요."
              : "잠시 후 다시 시도하거나 소속 체육관에 문의해 주세요."
          }
          tone="error"
        />
      </div>
    </div>
  );
}
