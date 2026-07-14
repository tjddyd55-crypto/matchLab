import Link from "next/link";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { MemberGymSummaryStrip } from "@/components/domain/member-gyms/MemberGymSummaryStrip";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import { MEMBER_GYM_APPLICATION_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymOverviewPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);

  const overview = await memberGymService.getOverview(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="회원사 현황"
        description="협회 회원사·가입 신청 요약입니다."
      />
      <MemberGymSubNav />
      <div className="mt-4 space-y-6">
        <MemberGymSummaryStrip
          items={[
            { label: "전체 회원사", value: overview.totals.memberGyms },
            { label: "정상", value: overview.totals.active },
            { label: "승인 대기 신청", value: overview.totals.applicationsPending },
            { label: "보완 요청", value: overview.totals.supplementation },
            { label: "보류", value: overview.totals.onHold },
            { label: "활성 링크", value: overview.totals.activeLinks },
          ]}
        />
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-matchon-text-primary">
            최근 신청
          </h2>
          <ul className="divide-y divide-matchon-border rounded-md border border-matchon-border bg-white">
            {overview.recent.length === 0 ? (
              <li className="px-3 py-4 text-sm text-matchon-text-secondary">
                최근 신청이 없습니다.
              </li>
            ) : (
              overview.recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/organizer/member-gyms/applications/${row.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm hover:bg-matchon-surface"
                  >
                    <span className="font-medium">{row.gymName}</span>
                    <span className="text-matchon-text-secondary">
                      {row.ownerName} ·{" "}
                      {MEMBER_GYM_APPLICATION_STATUS_LABEL[row.status]} · 첨부{" "}
                      {row._count.attachments} ·{" "}
                      {format(row.submittedAt, "yyyy-MM-dd")}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
