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
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL } from "@/lib/ui-labels/member-gym-owner";
import { format } from "date-fns";

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
        <div className="hidden overflow-x-auto rounded-md border border-matchon-border md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
              <tr>
                <th className="px-3 py-2">회원사명</th>
                <th className="px-3 py-2">회원사 코드</th>
                <th className="px-3 py-2">계정</th>
                <th className="px-3 py-2">선수(전체/활동)</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">승인일</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const accountStatus = resolveMemberGymOwnerAccountStatus({
                  owner: row.gym.ownerUser,
                  ownerAccessSuspendedAt: row.ownerAccessSuspendedAt,
                  ownerInviteTokenHash: row.ownerInviteTokenHash,
                  ownerInviteExpiresAt: row.ownerInviteExpiresAt,
                });
                const activeFighters = row.gym.fighters.length;
                return (
                <tr key={row.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 font-medium">{row.gym.name}</td>
                  <td className="px-3 py-2 tabular-nums">{row.memberCode}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-matchon-surface px-2 py-0.5 text-xs">
                      {MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[accountStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.gym._count.fighters} / {activeFighters}
                  </td>
                  <td className="px-3 py-2">
                    {MEMBER_GYM_STATUS_LABEL[row.status]}
                  </td>
                  <td className="px-3 py-2">
                    {row.approvedAt
                      ? format(row.approvedAt, "yyyy-MM-dd")
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/organizer/member-gyms/${row.id}`}
                      className="text-matchon-primary underline"
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {rows.map((row) => {
            const accountStatus = resolveMemberGymOwnerAccountStatus({
              owner: row.gym.ownerUser,
              ownerAccessSuspendedAt: row.ownerAccessSuspendedAt,
              ownerInviteTokenHash: row.ownerInviteTokenHash,
              ownerInviteExpiresAt: row.ownerInviteExpiresAt,
            });
            const activeFighters = row.gym.fighters.length;
            return (
              <li
                key={row.id}
                className="rounded-md border border-matchon-border bg-white p-3"
              >
                <Link
                  href={`/organizer/member-gyms/${row.id}`}
                  className="block"
                >
                  <p className="font-semibold">{row.gym.name}</p>
                  <p className="mt-1 text-xs text-matchon-text-secondary">
                    {row.memberCode} · {MEMBER_GYM_STATUS_LABEL[row.status]} ·{" "}
                    {MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[accountStatus]}
                  </p>
                  <p className="mt-0.5 text-xs text-matchon-text-secondary">
                    선수 {row.gym._count.fighters} / 활동 {activeFighters}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            승인된 회원사가 없습니다.
          </p>
        ) : null}
      </div>
    </>
  );
}
