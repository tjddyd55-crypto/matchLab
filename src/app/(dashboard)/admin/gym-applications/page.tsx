import Link from "next/link";
import { GymApplicationReviewActions } from "@/components/domain/gym-applications/GymApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { describeApplicationLoginIds } from "@/lib/admin/application-login-id-display";
import { requireActor } from "@/lib/auth/actor";
import { GymApplicationStatus } from "@/lib/enums";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import {
  getGymPlatformApplicationStatusLabel,
  isGymApplicationAwaitingReview,
  resolveGymPlatformApplicationStatusMatchon,
} from "@/lib/ui/gym-application-status";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function parseStatusFilter(raw: string | string[] | undefined): StatusFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return "all";
}

function matchesFilter(
  status: GymApplicationStatus,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return isGymApplicationAwaitingReview(status);
  if (filter === "approved") return status === GymApplicationStatus.approved;
  return (
    status === GymApplicationStatus.rejected ||
    status === GymApplicationStatus.withdrawn
  );
}

export default async function AdminGymApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const filter = parseStatusFilter(params.status);
  const allRows = await gymApplicationService.listForAdmin(actor);
  const pendingCount = allRows.filter((row) =>
    isGymApplicationAwaitingReview(row.status),
  ).length;
  const rows = allRows.filter((row) => matchesFilter(row.status, filter));

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: `전체 ${allRows.length}` },
    { id: "pending", label: `승인대기 ${pendingCount}` },
    {
      id: "approved",
      label: `승인 ${allRows.filter((r) => r.status === "approved").length}`,
    },
    {
      id: "rejected",
      label: `반려/철회 ${
        allRows.filter(
          (r) => r.status === "rejected" || r.status === "withdrawn",
        ).length
      }`,
    },
  ];

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="체육관 가입 신청"
          description="플랫폼 독립 체육관 가입을 검토·승인합니다. 승인 시 협회 회원사 관계는 생성되지 않으며, 초대 링크가 1회 표시됩니다."
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Link
              key={item.id}
              href={
                item.id === "all"
                  ? "/admin/gym-applications"
                  : `/admin/gym-applications?status=${item.id}`
              }
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors",
                filter === item.id
                  ? "border-matchon-primary bg-matchon-primary-light text-matchon-primary"
                  : "border-matchon-border bg-white text-matchon-text-secondary hover:border-matchon-primary/30",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className={adminContentCardClass}>
          <ul className="divide-y">
            {rows.map((row) => {
              const ids = describeApplicationLoginIds({
                requestedLoginId: row.requestedLoginId,
                currentLoginId: row.createdGym?.ownerUser.loginId,
                authUserId: row.createdGym?.ownerUser.authUserId,
                approved: row.status === "approved",
              });
              return (
                <li key={row.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{row.gymName}</p>
                        <MatchonStatusBadge
                          status={resolveGymPlatformApplicationStatusMatchon(
                            row.status,
                          )}
                          label={getGymPlatformApplicationStatusLabel(
                            row.status,
                          )}
                        />
                      </div>
                      <p className="text-sm text-matchon-text-secondary">
                        대표자 {row.representativeName} · 담당자 {row.contactName}
                      </p>
                      <p className="break-all text-sm text-matchon-text-secondary">
                        신청 로그인 아이디: {ids.requestedLoginIdLabel}
                      </p>
                      <p className="break-all text-sm text-matchon-text-secondary">
                        현재 로그인 아이디: {ids.currentLoginIdLabel}
                      </p>
                      <p className="text-sm text-matchon-text-secondary">
                        {row.mobilePhone} · {row.email}
                      </p>
                      <p className="text-xs text-matchon-text-secondary">
                        계정: {ids.accountStatusLabel} ·{" "}
                        {row.submittedAt.toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <Link
                      href={`/admin/gym-applications/${row.id}`}
                      className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
                    >
                      상세
                    </Link>
                  </div>
                  <GymApplicationReviewActions
                    applicationId={row.id}
                    canReview={
                      row.status === "pending" || row.status === "under_review"
                    }
                  />
                </li>
              );
            })}
            {rows.length === 0 ? (
              <li className="py-6 text-sm text-matchon-text-secondary">
                {filter === "pending"
                  ? "승인대기 신청이 없습니다."
                  : "접수된 체육관 가입 신청이 없습니다."}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
