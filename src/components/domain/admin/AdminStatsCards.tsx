import type { AdminDashboardStatsDTO } from "@/lib/dto/admin";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGridClass } from "@/lib/ui/event-management-ui";

export function AdminStatsCards({ stats }: { stats: AdminDashboardStatsDTO }) {
  return (
    <div className={eventManagementStatGridClass}>
      <MatchonStatCardButton
        label="전체 대회"
        value={stats.totalEvents.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="모집 중(open)"
        value={stats.openEvents.toLocaleString("ko-KR")}
        hint="진행·종료는 별도 카드 참고"
      />
      <MatchonStatCardButton
        label="진행 중(ongoing)"
        value={stats.ongoingEvents.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="종료(finished)"
        value={stats.finishedEvents.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="주최자"
        value={stats.totalOrganizers.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="체육관"
        value={stats.totalGyms.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="선수"
        value={stats.totalFighters.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="신청 전체"
        value={stats.totalApplications.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="신청 승인"
        value={stats.approvedApplications.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="신청 대기"
        value={stats.pendingApplications.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="경기(BracketMatch)"
        value={stats.totalMatches.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="결과 행(MatchResult)"
        value={stats.totalMatchResults.toLocaleString("ko-KR")}
      />
      <MatchonStatCardButton
        label="확정 결과(confirmed)"
        value={stats.confirmedResults.toLocaleString("ko-KR")}
        hint="선수별 결과 행 기준"
      />
    </div>
  );
}
