import Link from "next/link";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { MemberGymSummaryStrip } from "@/components/domain/member-gyms/MemberGymSummaryStrip";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationMemberGymStatus } from "@/lib/enums";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
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
      />
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
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">지역</th>
                <th className="px-3 py-2">선수</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">가입일</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 font-medium">{row.gym.name}</td>
                  <td className="px-3 py-2 tabular-nums">{row.memberCode}</td>
                  <td className="px-3 py-2">{row.gym.phone ?? "-"}</td>
                  <td className="px-3 py-2">{row.gym.address ?? "-"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.gym._count.fighters}
                  </td>
                  <td className="px-3 py-2">
                    {MEMBER_GYM_STATUS_LABEL[row.status]}
                  </td>
                  <td className="px-3 py-2">
                    {format(row.joinedAt, "yyyy-MM-dd")}
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
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-matchon-border bg-white p-3"
            >
              <Link href={`/organizer/member-gyms/${row.id}`} className="block">
                <p className="font-semibold">{row.gym.name}</p>
                <p className="mt-1 text-xs text-matchon-text-secondary">
                  {row.memberCode} · {MEMBER_GYM_STATUS_LABEL[row.status]} · 선수{" "}
                  {row.gym._count.fighters}
                </p>
              </Link>
            </li>
          ))}
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
