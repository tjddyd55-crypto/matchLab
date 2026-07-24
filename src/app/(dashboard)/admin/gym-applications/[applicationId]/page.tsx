import Link from "next/link";
import { GymApplicationReviewActions } from "@/components/domain/gym-applications/GymApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { formatPostalAddress } from "@/lib/postal-address";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

const ATTACHMENT_LABEL: Record<string, string> = {
  business_registration: "사업자등록증",
  representative_photo: "증명사진",
  gym_exterior_photo: "체육관 외부 사진",
  gym_interior_photo: "체육관 내부 사진",
  dan_certificate: "단증",
  coach_certificate: "지도자 자격",
  referee_certificate: "심판 자격",
  applicant_signature: "손서명",
  other: "기타",
};

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
        <div className={`${adminContentCardClass} space-y-4`}>
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
            <div>
              <dt className="text-matchon-text-secondary">사업자등록번호</dt>
              <dd className="font-medium">{row.businessNo || "—"}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">운영 종목</dt>
              <dd className="font-medium">{row.sportType || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">주소</dt>
              <dd className="font-medium">
                {formatPostalAddress({
                  postalCode: row.postalCode,
                  address: row.address,
                  addressDetail: row.addressDetail,
                }) || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">소개</dt>
              <dd className="font-medium whitespace-pre-wrap">
                {row.description || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">신청인</dt>
              <dd className="font-medium">{row.signatureName || "—"}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">협회 연결</dt>
              <dd className="font-medium">협회 연결 없음</dd>
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

          <div>
            <p className="mb-2 text-sm font-semibold">첨부파일</p>
            {row.attachments.length === 0 ? (
              <p className="text-sm text-matchon-text-secondary">첨부 없음</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {row.attachments.map((a) => (
                  <li key={a.id}>
                    {ATTACHMENT_LABEL[a.attachmentType] ?? a.attachmentType} ·{" "}
                    {a.originalFileName}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <GymApplicationReviewActions
            applicationId={row.id}
            canReview={
              row.status === "pending" || row.status === "under_review"
            }
          />
        </div>
      </div>
    </div>
  );
}
