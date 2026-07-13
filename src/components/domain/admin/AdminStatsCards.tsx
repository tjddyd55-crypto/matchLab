import type { AdminDashboardStatsDTO } from "@/lib/dto/admin";
import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatsGridClass,
  matchonStatValueClass,
} from "@/lib/ui/admin-ui";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className={matchonStatCardClass}>
      <p className={matchonStatLabelClass}>{label}</p>
      <p className={`${matchonStatValueClass} mt-1 tabular-nums`}>
        {value.toLocaleString("ko-KR")}
      </p>
      {hint ? (
        <p className={`${matchonStatLabelClass} mt-1 leading-relaxed`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function AdminStatsCards({ stats }: { stats: AdminDashboardStatsDTO }) {
  return (
    <div className={matchonStatsGridClass}>
      <StatCard label="전체 대회" value={stats.totalEvents} />
      <StatCard
        label="모집 중(open)"
        value={stats.openEvents}
        hint="진행·종료는 별도 카드 참고"
      />
      <StatCard label="진행 중(ongoing)" value={stats.ongoingEvents} />
      <StatCard label="종료(finished)" value={stats.finishedEvents} />
      <StatCard label="주최자" value={stats.totalOrganizers} />
      <StatCard label="체육관" value={stats.totalGyms} />
      <StatCard label="선수" value={stats.totalFighters} />
      <StatCard label="신청 전체" value={stats.totalApplications} />
      <StatCard label="신청 승인" value={stats.approvedApplications} />
      <StatCard label="신청 대기" value={stats.pendingApplications} />
      <StatCard label="경기(BracketMatch)" value={stats.totalMatches} />
      <StatCard label="결과 행(MatchResult)" value={stats.totalMatchResults} />
      <StatCard
        label="확정 결과(confirmed)"
        value={stats.confirmedResults}
        hint="선수별 결과 행 기준"
      />
    </div>
  );
}
