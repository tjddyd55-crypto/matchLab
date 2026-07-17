import Link from "next/link";
import { AssociationConnectionRequestsPanel } from "@/components/domain/member-gyms/AssociationConnectionRequestsPanel";
import { MemberGymJoinLinkQuickActions } from "@/components/domain/member-gyms/MemberGymJoinLinkQuickActions";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AssociationMemberGymApplicationStatus } from "@/lib/enums";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { associationGymConnectionService } from "@/lib/services/association-gym-connection.service";
import { memberGymService } from "@/lib/services/member-gym.service";
import {
  MEMBER_GYM_APPLICATION_FILTERS,
  MEMBER_GYM_APPLICATION_STATUS_LABEL,
  resolveMemberGymApplicationSourceLabel,
} from "@/lib/ui-labels/member-gym";
import { formatPhoneNumber } from "@/lib/phone";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberGymApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; source?: string }>;
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
  const sourceGroup =
    sp.source === "online" || sp.source === "manual" ? sp.source : undefined;
  const rows = await memberGymService.listApplications(actor, {
    status,
    q: sp.q,
    sourceGroup,
  });
  const connectionRequests = actor.organizerId
    ? await associationGymConnectionService.listPendingForOrganizer(
        actor,
        actor.organizerId,
      )
    : [];

  function withQuery(next: { status?: string; source?: string }) {
    const params = new URLSearchParams();
    const st = next.status ?? sp.status;
    const src = next.source ?? sp.source;
    if (st && st !== "all") params.set("status", st);
    if (src === "online" || src === "manual") params.set("source", src);
    if (sp.q) params.set("q", sp.q);
    const qs = params.toString();
    return qs
      ? `/organizer/member-gyms/applications?${qs}`
      : "/organizer/member-gyms/applications";
  }

  return (
    <>
      <OrganizerDashboardPageHeader
        title="가입 신청"
        description="온라인 및 직접 접수된 회원사 가입 신청을 관리합니다."
      >
        <MemberGymJoinLinkQuickActions />
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4">
          <h2 className="text-sm font-bold text-matchon-text-primary">
            기존 체육관 연결 요청
          </h2>
          <p className="text-xs text-matchon-text-secondary">
            이미 MATCHON에 가입된 체육관의 협회 연결 요청입니다. 아래「신규
            체육관 가입」신청과 구분됩니다.
          </p>
          <AssociationConnectionRequestsPanel
            rows={connectionRequests.map((r) => ({
              id: r.id,
              memo: r.memo,
              createdAt: r.createdAt.toISOString(),
              gym: r.gym,
              requestingUser: r.requestingUser,
            }))}
          />
        </section>
        <h2 className="text-sm font-bold text-matchon-text-primary">
          신규 체육관 가입 신청
        </h2>
        <div className="flex flex-wrap gap-2">
          {MEMBER_GYM_APPLICATION_FILTERS.map((tab) => {
            const href = withQuery({
              status: tab === "all" ? "all" : tab,
            });
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
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "전체 접수" },
              { id: "online", label: "온라인" },
              { id: "manual", label: "직접 등록" },
            ] as const
          ).map((tab) => {
            const active = (sp.source ?? "all") === tab.id;
            const href =
              tab.id === "all"
                ? withQuery({ source: undefined })
                : withQuery({ source: tab.id });
            return (
              <Link
                key={tab.id}
                href={
                  tab.id === "all"
                    ? (() => {
                        const params = new URLSearchParams();
                        if (sp.status && sp.status !== "all") {
                          params.set("status", sp.status);
                        }
                        if (sp.q) params.set("q", sp.q);
                        const qs = params.toString();
                        return qs
                          ? `/organizer/member-gyms/applications?${qs}`
                          : "/organizer/member-gyms/applications";
                      })()
                    : href
                }
                className={
                  active
                    ? "rounded-md bg-matchon-surface px-3 py-1.5 text-xs font-semibold text-matchon-primary"
                    : "rounded-md border border-dashed border-matchon-border px-3 py-1.5 text-xs text-matchon-text-secondary"
                }
              >
                {tab.label}
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
          {sp.source ? (
            <input type="hidden" name="source" value={sp.source} />
          ) : null}
          <button
            type="submit"
            className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white"
          >
            검색
          </button>
        </form>
        <div className="hidden overflow-x-auto rounded-md border border-matchon-border md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
              <tr>
                <th className="px-3 py-2">체육관명</th>
                <th className="px-3 py-2">대표자</th>
                <th className="px-3 py-2">접수 방식</th>
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
                  <td className="px-3 py-2">
                    <span className="rounded bg-matchon-surface px-2 py-0.5 text-xs">
                      {resolveMemberGymApplicationSourceLabel(
                        row.submissionSource,
                        row.joinLinkId,
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {formatPhoneNumber(row.phone) || row.phone}
                  </td>
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
                  {resolveMemberGymApplicationSourceLabel(
                    row.submissionSource,
                    row.joinLinkId,
                  )}{" "}
                  · {MEMBER_GYM_APPLICATION_STATUS_LABEL[row.status]}
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
