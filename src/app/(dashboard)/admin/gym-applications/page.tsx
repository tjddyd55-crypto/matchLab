import Link from "next/link";
import { GymApplicationReviewActions } from "@/components/domain/gym-applications/GymApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { describeApplicationLoginIds } from "@/lib/admin/application-login-id-display";
import { requireActor } from "@/lib/auth/actor";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminGymApplicationsPage() {
  const actor = await requireActor();
  const rows = await gymApplicationService.listForAdmin(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="체육관 가입 신청"
          description="플랫폼 독립 체육관 가입을 검토·승인합니다. 승인 시 협회 회원사 관계는 생성되지 않으며, 초대 링크가 1회 표시됩니다."
        />
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
                      <p className="font-semibold">{row.gymName}</p>
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
                        상태: {row.status} · 계정: {ids.accountStatusLabel} ·{" "}
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
                접수된 체육관 가입 신청이 없습니다.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
