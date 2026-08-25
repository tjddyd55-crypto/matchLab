import Link from "next/link";
import { GymApplicationReviewActions } from "@/components/domain/gym-applications/GymApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPasswordResetLinkPanel } from "@/components/domain/admin/AdminPasswordResetLinkPanel";
import { resolveAdminAccountIdentityFromGymApplication } from "@/lib/admin/admin-account-identity";
import { describeApplicationLoginIds } from "@/lib/admin/application-login-id-display";
import { tryResolveAdminResetClientTarget } from "@/lib/admin/try-resolve-admin-reset-target";
import { requireActor } from "@/lib/auth/actor";
import { formatPostalAddress } from "@/lib/postal-address";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import { getGymPlatformApplicationStatusLabel } from "@/lib/ui/gym-application-status";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
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
  const adminResetEnabled = loadMatchonAdminPasswordResetLinkConfig().enabled;
  const row = await gymApplicationService.getForAdmin(actor, applicationId);
  const identity = await resolveAdminAccountIdentityFromGymApplication({
    createdGymId: row.createdGymId,
    requestedLoginId: row.requestedLoginId,
  });
  const display = describeApplicationLoginIds({
    requestedLoginId: row.requestedLoginId,
    currentLoginId: row.createdGym?.ownerUser.loginId ?? identity.loginId,
    authUserId: row.createdGym?.ownerUser.authUserId,
    approved: row.status === "approved",
  });
  const resetTarget = identity.resetEligible
    ? await tryResolveAdminResetClientTarget(actor, identity.userId)
    : null;

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
            <div className="sm:col-span-2 rounded-md border border-matchon-border bg-matchon-surface p-3">
              <dt className="font-semibold text-matchon-text-primary">계정 정보</dt>
              <dd className="mt-2 space-y-1">
                <p className="break-all font-medium">
                  신청 로그인 아이디: {display.requestedLoginIdLabel}
                </p>
                <p className="break-all font-medium">
                  현재 로그인 아이디: {display.currentLoginIdLabel}
                </p>
                <p className="font-medium">이메일: {row.email}</p>
                <p className="font-medium">연락처: {row.mobilePhone}</p>
                <p className="font-medium">계정 상태: {display.accountStatusLabel}</p>
                {display.mismatchWarning ? (
                  <p className="text-xs text-amber-800">{display.mismatchWarning}</p>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">사업자등록번호</dt>
              <dd className="font-medium">{row.businessNo || "확인 불가"}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">운영 종목</dt>
              <dd className="font-medium">{row.sportType || "확인 불가"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">주소</dt>
              <dd className="font-medium">
                {formatPostalAddress({
                  postalCode: row.postalCode,
                  address: row.address,
                  addressDetail: row.addressDetail,
                }) || "확인 불가"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-matchon-text-secondary">소개</dt>
              <dd className="font-medium whitespace-pre-wrap">
                {row.description || "확인 불가"}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">신청인</dt>
              <dd className="font-medium">{row.signatureName || "확인 불가"}</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">협회 연결</dt>
              <dd className="font-medium">협회 연결 없음</dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">상태</dt>
              <dd className="font-medium">
                {getGymPlatformApplicationStatusLabel(row.status)}
              </dd>
            </div>
            <div>
              <dt className="text-matchon-text-secondary">생성 Gym</dt>
              <dd className="font-medium">
                {row.createdGymId ? (
                  <Link
                    href={`/admin/gyms/${row.createdGymId}`}
                    className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                  >
                    {row.createdGymId}
                  </Link>
                ) : (
                  "확인 불가"
                )}
              </dd>
            </div>
          </dl>

          {row.status === "approved" && row.createdGymId ? (
            <p>
              <Link
                href={`/admin/gyms/${row.createdGymId}`}
                className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                체육관 상세 보기 →
              </Link>
            </p>
          ) : null}

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

        {adminResetEnabled ? (
          <div className={adminContentCardClass}>
            {identity.resetEligible ? (
              <AdminPasswordResetLinkPanel
                initialUserId={identity.userId}
                initialTarget={resetTarget}
                initialLoginId={identity.loginId ?? ""}
                unresolvedHint={identity.hint}
              />
            ) : (
              <p className="text-sm text-matchon-text-secondary">
                계정이 아직 활성화되지 않아 비밀번호 재설정 링크를 발급할 수
                {" "}
                없습니다.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
