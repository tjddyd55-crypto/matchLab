import Link from "next/link";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationMemberGymApplicationStatus } from "@/lib/enums";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import {
  MEMBER_GYM_APPLICATION_FILTERS,
  MEMBER_GYM_APPLICATION_STATUS_LABEL,
} from "@/lib/ui-labels/member-gym";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const sp = await searchParams;
  const status =
    sp.status &&
    sp.status !== "all" &&
    Object.values(AssociationMemberGymApplicationStatus).includes(
      sp.status as AssociationMemberGymApplicationStatus,
    )
      ? (sp.status as AssociationMemberGymApplicationStatus)
      : undefined;
  const rows = await memberGymService.listApplications(actor, {
    status,
    q: sp.q,
  });

  return (
    <>
      <OrganizerDashboardPageHeader
        title="가입 신청"
        description="접수된 회원사 가입 신청을 검토합니다."
      />
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {MEMBER_GYM_APPLICATION_FILTERS.map((tab) => {
            const href =
              tab === "all"
                ? "/organizer/member-gyms/applications"
                : `/organizer/member-gyms/applications?status=${tab}`;
            const active = (sp.status ?? "all") === tab;
            return (
              <Link
                key={tab}
                href={href}
                className={
                  active
                    ? "rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-md border border-matchon-border px-3 py-1.5 text-xs"
                }
              >
                {tab === "all"
                  ? "전체"
                  : MEMBER_GYM_APPLICATION_STATUS_LABEL[
                      tab as AssociationMemberGymApplicationStatus
                    ]}
              </Link>
            );
          })}
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="체육관·대표자·연락처"
            className="flex-1 rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
          {sp.status ? (
            <input type="hidden" name="status" value={sp.status} />
          ) : null}
          <button
            type="submit"
            className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white"
          >
            검색
          </button>
        </form>
        <div className="hidden overflow-x-auto rounded-md border border-matchon-border md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
              <tr>
                <th className="px-3 py-2">체육관명</th>
                <th className="px-3 py-2">대표자</th>
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">지역</th>
                <th className="px-3 py-2">신청일</th>
                <th className="px-3 py-2">첨부</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 font-medium">{row.gymName}</td>
                  <td className="px-3 py-2">{row.ownerName}</td>
                  <td className="px-3 py-2">{row.phone}</td>
                  <td className="px-3 py-2">{row.gymAddress}</td>
                  <td className="px-3 py-2">
                    {format(row.submittedAt, "yyyy-MM-dd")}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row._count.attachments}
                  </td>
                  <td className="px-3 py-2">
                    {MEMBER_GYM_APPLICATION_STATUS_LABEL[row.status]}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/organizer/member-gyms/applications/${row.id}`}
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
              <Link
                href={`/organizer/member-gyms/applications/${row.id}`}
                className="block"
              >
                <p className="font-semibold">{row.gymName}</p>
                <p className="mt-1 text-xs text-matchon-text-secondary">
                  {row.ownerName} ·{" "}
                  {MEMBER_GYM_APPLICATION_STATUS_LABEL[row.status]}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">신청이 없습니다.</p>
        ) : null}
      </div>
    </>
  );
}
