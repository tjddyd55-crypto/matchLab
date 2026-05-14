import Link from "next/link";
import { AdminRecentApplications } from "@/components/domain/admin/AdminRecentApplications";
import { AdminRecentAuditLogs } from "@/components/domain/admin/AdminRecentAuditLogs";
import { AdminRecentEvents } from "@/components/domain/admin/AdminRecentEvents";
import { AdminRecentResults } from "@/components/domain/admin/AdminRecentResults";
import { AdminStatsCards } from "@/components/domain/admin/AdminStatsCards";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const actor = await requireActor();
  const data = await adminService.getAdminDashboard(actor);

  const subLink = cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          관리자 개요
        </h1>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          조회 전용 대시보드입니다. 역할 변경·계정 조치·대회/전적 강제 수정·입금
          조작은 이 단계에서 제공하지 않습니다. 민감 개인정보·보호자·서명 경로는
          노출하지 않습니다.
        </p>
      </header>

      <AdminStatsCards stats={data.stats} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">최근 대회</h2>
          <Link href="/admin/events" className={subLink}>
            전체 대회 →
          </Link>
        </div>
        <AdminRecentEvents rows={data.recentEvents} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">최근 신청</h2>
          <Link href="/admin/applications" className={subLink}>
            전체 신청 →
          </Link>
        </div>
        <AdminRecentApplications rows={data.recentApplications} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">최근 결과(MatchResult)</h2>
          <Link href="/admin/results" className={subLink}>
            전체 결과 →
          </Link>
        </div>
        <AdminRecentResults rows={data.recentMatchResults} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">최근 감사 로그</h2>
          <Link href="/admin/audit-logs" className={subLink}>
            전체 로그 →
          </Link>
        </div>
        <AdminRecentAuditLogs rows={data.recentAuditLogs} />
      </section>
    </div>
  );
}
