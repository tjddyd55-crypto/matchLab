import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { desktopStaticPageFillClass } from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 스파링 매칭 placeholder — 메뉴 선반영용 준비중 화면.
 * 모집/제안/매칭 기능은 구현하지 않는다.
 */
export default async function GymSparringMatchingPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);

  return (
    <div className={cn(matchonPageContainerClass, desktopStaticPageFillClass)}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>스파링 매칭</h1>
          <p className={matchonPageDescClass}>
            체육관 간 공개 스파링 상대를 찾을 수 있는 공간입니다.
          </p>
        </div>

        <section className="max-w-2xl space-y-4 rounded-xl border border-matchon-border bg-white p-5 text-sm leading-relaxed text-matchon-text-secondary shadow-sm md:p-6">
          <p>
            소속 선수를 공개하고 다른 체육관의 비슷한 체급·조건의 선수와 스파링을
            제안할 수 있습니다.
          </p>
          <p className="font-semibold text-matchon-text-primary">
            준비중인 기능입니다.
          </p>
        </section>
      </div>
    </div>
  );
}
