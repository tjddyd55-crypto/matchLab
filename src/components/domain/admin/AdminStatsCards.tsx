import type { AdminDashboardStatsDTO } from "@/lib/dto/admin";
import { OperationalMetricCard } from "@/components/shared/OperationalMetricCard";
import { eventManagementStatGridAdminClass } from "@/lib/ui/event-management-ui";

export function AdminStatsCards({ stats }: { stats: AdminDashboardStatsDTO }) {
  return (
    <div className={eventManagementStatGridAdminClass}>
      <OperationalMetricCard
        label="전체 대회"
        value={stats.totalEvents.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="모집 중(open)"
        value={stats.openEvents.toLocaleString("ko-KR")}
        hint="진행·종료는 별도 카드 참고"
      />
      <OperationalMetricCard
        label="진행 중(ongoing)"
        value={stats.ongoingEvents.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="종료(finished)"
        value={stats.finishedEvents.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="주최자"
        value={stats.totalOrganizers.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="체육관"
        value={stats.totalGyms.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="선수"
        value={stats.totalFighters.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="신청 전체"
        value={stats.totalApplications.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="신청 승인"
        value={stats.approvedApplications.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="신청 대기"
        value={stats.pendingApplications.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="경기(BracketMatch)"
        value={stats.totalMatches.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="결과 행(MatchResult)"
        value={stats.totalMatchResults.toLocaleString("ko-KR")}
      />
      <OperationalMetricCard
        label="확정 결과(confirmed)"
        value={stats.confirmedResults.toLocaleString("ko-KR")}
        hint="선수별 결과 행 기준"
      />
    </div>
  );
}
