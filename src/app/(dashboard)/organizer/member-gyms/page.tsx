import Link from "next/link";
import { MemberGymJoinLinkQuickActions } from "@/components/domain/member-gyms/MemberGymJoinLinkQuickActions";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { MemberGymSummaryStrip } from "@/components/domain/member-gyms/MemberGymSummaryStrip";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationMemberGymStatus } from "@/lib/enums";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import { resolveMemberGymOwnerAccountStatus } from "@/lib/member-gym/owner-account";
import { MemberGymListExcelExport } from "@/components/domain/member-gyms/MemberGymListExcelExport";
import { MemberGymListWithBulkSms } from "@/components/domain/member-gyms/MemberGymListWithBulkSms";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";

export const dynamic = "force-dynamic";

export default async function MemberGymListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const sp = await searchParams;
  const status =
    sp.status &&
    Object.values(AssociationMemberGymStatus).includes(
      sp.status as AssociationMemberGymStatus,
    )
      ? (sp.status as AssociationMemberGymStatus)
      : undefined;
  const rows = await memberGymService.listMemberGyms(actor, {
    status,
    q: sp.q,
  });
  const overview = await memberGymService.getOverview(actor);
  const hasActiveFilters = Boolean(sp.q?.trim() || status);
  const memberGymIds = rows.map((row) => row.id);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="회원사 목록"
        description="승인된 협회 회원사입니다. 체육관 SoT는 기존 Gym이며, 회원사 코드는 협회 행정용입니다."
      >
        <MemberGymJoinLinkQuickActions
          showCopy={false}
          showLinkManage={false}
          showDirectRegister
        />
        <MemberGymListExcelExport
          memberGymIds={memberGymIds}
          filteredCount={rows.length}
          totalCount={overview.totals.memberGyms}
          hasActiveFilters={hasActiveFilters}
          filters={{ q: sp.q, status: sp.status }}
        />
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <MemberGymSummaryStrip
          items={[
            { label: "전체", value: overview.totals.memberGyms },
            { label: "정상", value: overview.totals.active },
            { label: "정지", value: overview.totals.suspended },
            { label: "탈퇴", value: overview.totals.withdrawn },
          ]}
        />
        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="회원사·코드·연락처"
            className="min-w-[200px] flex-1 rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded-md border border-matchon-border px-3 py-2 text-sm"
          >
            <option value="">전체 상태</option>
            {Object.values(AssociationMemberGymStatus).map((s) => (
              <option key={s} value={s}>
                {MEMBER_GYM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white"
          >
            검색
          </button>
        </form>
        <MemberGymListWithBulkSms
          totalCount={overview.totals.memberGyms}
          rows={rows.map((row) => ({
            id: row.id,
            memberCode: row.memberCode,
            status: row.status,
            approvedAt: row.approvedAt?.toISOString() ?? null,
            ownerAccessSuspendedAt:
              row.ownerAccessSuspendedAt?.toISOString() ?? null,
            ownerInviteTokenHash: row.ownerInviteTokenHash,
            ownerInviteExpiresAt:
              row.ownerInviteExpiresAt?.toISOString() ?? null,
            gym: {
              name: row.gym.name,
              ownerUser: row.gym.ownerUser
                ? { authUserId: row.gym.ownerUser.authUserId }
                : null,
              fighters: row.gym.fighters,
              _count: row.gym._count,
            },
            accountStatus: resolveMemberGymOwnerAccountStatus({
              owner: row.gym.ownerUser,
              ownerAccessSuspendedAt: row.ownerAccessSuspendedAt,
              ownerInviteTokenHash: row.ownerInviteTokenHash,
              ownerInviteExpiresAt: row.ownerInviteExpiresAt,
            }),
          }))}
        />
        {rows.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            승인된 회원사가 없습니다.
          </p>
        ) : null}
      </div>
    </>
  );
}
