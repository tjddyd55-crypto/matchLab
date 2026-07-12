import Link from "next/link";
import { AdminRecentApplications } from "@/components/domain/admin/AdminRecentApplications";
import { AdminRecentAuditLogs } from "@/components/domain/admin/AdminRecentAuditLogs";
import { AdminRecentEvents } from "@/components/domain/admin/AdminRecentEvents";
import { AdminRecentResults } from "@/components/domain/admin/AdminRecentResults";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminStatsCards } from "@/components/domain/admin/AdminStatsCards";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import {
  adminPageContainerClass,
  adminPageStackClass,
  matchonSectionTitleClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const actor = await requireActor();
  const data = await adminService.getAdminDashboard(actor);

  const subLink = cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0");

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="관리자 개요"
          description="조회 전용 대시보드입니다. 역할 변경·계정 조치·대회/전적 강제 수정·입금 조작은 이 단계에서 제공하지 않습니다. 민감 개인정보·보호자·서명 경로는 노출하지 않습니다."
        />

        <AdminStatsCards stats={data.stats} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className={matchonSectionTitleClass}>최근 대회</h2>
            <Link href="/admin/events" className={subLink}>
              전체 대회 →
            </Link>
          </div>
          <Card>
            <CardContent className="pt-4">
              <AdminRecentEvents rows={data.recentEvents} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className={matchonSectionTitleClass}>최근 신청</h2>
            <Link href="/admin/applications" className={subLink}>
              전체 신청 →
            </Link>
          </div>
          <Card>
            <CardContent className="pt-4">
              <AdminRecentApplications rows={data.recentApplications} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className={matchonSectionTitleClass}>최근 결과(MatchResult)</h2>
            <Link href="/admin/results" className={subLink}>
              전체 결과 →
            </Link>
          </div>
          <Card>
            <CardContent className="pt-4">
              <AdminRecentResults rows={data.recentMatchResults} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className={matchonSectionTitleClass}>최근 감사 로그</h2>
            <Link href="/admin/audit-logs" className={subLink}>
              전체 로그 →
            </Link>
          </div>
          <Card>
            <CardContent className="pt-4">
              <AdminRecentAuditLogs rows={data.recentAuditLogs} />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
