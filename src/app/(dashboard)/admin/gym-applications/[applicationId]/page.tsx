import Link from "next/link";
import { GymApplicationReviewActions } from "@/components/domain/gym-applications/GymApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminGymApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const actor = await requireActor();
  const { applicationId } = await params;
  const row = await gymApplicationService.getForAdmin(actor, applicationId);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title={row.gymName}
          description="독립 체육관 가입 신청 상세"
        />
        <p>
          <Link
            href="/admin/gym-applications"
            className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 목록
          </Link>
        </p>
        <div className={adminContentCardClass}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-matchon-text-secondary">대표자</dt>
              <dd className="font-medium">{row.representativeName}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">담당자</dt>
              <dd className="font-medium">{row.contactName}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">연락처</dt>
              <dd className="font-medium">
                {row.mobilePhone}
                {row.phone ? ` / ${row.phone}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">이메일</dt>
              <dd className="font-medium">{row.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">주소</dt>
              <dd className="font-medium">
                {[row.postalCode, row.address, row.addressDetail]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">소개</dt>
              <dd className="font-medium whitespace-pre-wrap">
                {row.description || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">상태</dt>
              <dd className="font-medium">{row.status}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">생성 Gym</dt>
              <dd className="font-medium">{row.createdGymId || "—"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <GymApplicationReviewActions
              applicationId={row.id}
              canReview={
                row.status === "pending" || row.status === "under_review"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
