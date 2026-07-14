import { MatchonLogo } from "@/components/common/MatchonLogo";
import { matchonPageDescClass, matchonPageTitleClass } from "@/lib/ui/matchon-layout";
import { matchonInfoBannerClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

/**
 * 결과 입력 링크(스태프)는 폐기되었습니다.
 * 기존 URL로 진입해도 결과 변경이 불가하며, 안내만 표시합니다.
 * (DB 레코드는 유지 — 임의 삭제·migration 없음)
 */
export default async function StaffRecorderMatchesPage() {
  return (
    <div className="min-h-screen bg-matchon-surface">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-10 md:px-6">
        <MatchonLogo variant="light" size="sm" />
        <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
          Staff Result Entry
        </p>
        <h1 className={matchonPageTitleClass}>링크 사용 종료</h1>
        <p className={matchonPageDescClass}>
          이 결과 입력 링크는 더 이상 사용되지 않습니다. 주심 또는 운영자
          화면에서 결과를 처리해 주세요.
        </p>
        <p className={cn(matchonInfoBannerClass, "text-xs leading-relaxed")}>
          경기 상태·임시 결과·확정 결과는 주심 QR · 운영자 경기 운영 · 결과
          화면에서 처리합니다.
        </p>
      </div>
    </div>
  );
}
