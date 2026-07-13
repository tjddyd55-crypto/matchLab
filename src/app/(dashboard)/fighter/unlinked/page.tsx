import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function FighterUnlinkedPage() {
  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-lg")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>계정 연결 필요</h1>
        </header>
        <FighterDashboardEmptyState
          title="선수 계정이 등록 선수 정보와 연결되지 않았습니다"
          description="소속 체육관에 문의해 주세요."
          tone="warning"
        />
      </div>
    </div>
  );
}
