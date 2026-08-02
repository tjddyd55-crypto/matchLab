import Link from "next/link";
import { AssociationGymConnectionRequestPanel } from "@/components/domain/member-gyms/AssociationGymConnectionRequestPanel";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationGymConnectionRequestStatus } from "@/lib/enums";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { gymAssociationConnectionService } from "@/lib/services/gym-association-connection.service";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "가입 완료" },
  { key: "rejected", label: "거절" },
  { key: "cancelled", label: "요청 취소" },
  { key: "withdrawn", label: "연결 해제" },
] as const;

export default async function AssociationGymConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const sp = await searchParams;
  const statusKey = sp.status ?? "all";
  const statusFilter =
    statusKey !== "all" &&
    Object.values(AssociationGymConnectionRequestStatus).includes(
      statusKey as AssociationGymConnectionRequestStatus,
    )
      ? (statusKey as AssociationGymConnectionRequestStatus)
      : "all";

  const rows = await gymAssociationConnectionService.listRequestsForAssociation(
    actor,
    statusFilter,
  );

  return (
    <>
      <OrganizerDashboardPageHeader
        title="체육관 연결 요청"
        description="체육관이 보낸 협회 가입 요청을 승인·거절합니다. 다른 협회의 요청은 표시되지 않습니다."
      />
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => {
            const href =
              tab.key === "all"
                ? "/organizer/member-gyms/connection-requests"
                : `/organizer/member-gyms/connection-requests?status=${tab.key}`;
            const active = statusKey === tab.key;
            return (
              <Link
                key={tab.key}
                href={href}
                className={
                  active
                    ? "rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-md border border-matchon-border px-3 py-1.5 text-xs"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <AssociationGymConnectionRequestPanel rows={rows} />
      </div>
    </>
  );
}
