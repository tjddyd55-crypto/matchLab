import { FighterDashboardEmptyState } from "@/components/domain/fighter-dashboard/FighterDashboardEmptyState";

export const dynamic = "force-dynamic";

export default function FighterUnlinkedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        계정 연결 필요
      </h1>
      <div className="mt-6">
        <FighterDashboardEmptyState
          title="선수 계정이 등록 선수 정보와 연결되지 않았습니다"
          description="소속 체육관에 문의해 주세요."
          tone="warning"
        />
      </div>
    </div>
  );
}
