import Link from "next/link";
import { notFound } from "next/navigation";
import { AssociationApplicationAttachmentsList } from "@/components/domain/association-applications/AssociationApplicationAttachmentsList";
import { AssociationApplicationReviewActions } from "@/components/domain/association-applications/AssociationApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPasswordResetLinkPanel } from "@/components/domain/admin/AdminPasswordResetLinkPanel";
import { resolveAdminAccountIdentityFromAssociationApplication } from "@/lib/admin/admin-account-identity";
import { describeApplicationLoginIds } from "@/lib/admin/application-login-id-display";
import { tryResolveAdminResetClientTarget } from "@/lib/admin/try-resolve-admin-reset-target";
import { requireActor } from "@/lib/auth/actor";
import { associationApplicationService } from "@/lib/services/association-application.service";
import { formatPostalAddress } from "@/lib/postal-address";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAssociationApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const actor = await requireActor();
  const { applicationId } = await params;
  const adminResetEnabled = loadMatchonAdminPasswordResetLinkConfig().enabled;
  let row;
  try {
    row = await associationApplicationService.getForAdmin(actor, applicationId);
  } catch {
    notFound();
  }

  const identity = await resolveAdminAccountIdentityFromAssociationApplication({
    createdOrganizerId: row.createdOrganizerId,
    requestedLoginId: row.requestedLoginId,
  });
  const display = describeApplicationLoginIds({
    requestedLoginId: row.requestedLoginId,
    currentLoginId: row.createdOrganizer?.user.loginId ?? identity.loginId,
    authUserId: row.createdOrganizer?.user.authUserId,
    approved: row.status === "approved",
  });
  const resetTarget = identity.resetEligible
    ? await tryResolveAdminResetClientTarget(actor, identity.userId)
    : null;

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader title={row.associationName} description="협회 가입 신청 상세" />
        <div className={`${adminContentCardClass} space-y-3 text-sm`}>
          <p>
            <span className="font-semibold">상태:</span> {row.status}
          </p>
          <p>
            <span className="font-semibold">대표자:</span> {row.representativeName}
          </p>
          <p>
            <span className="font-semibold">담당자:</span> {row.contactName} /{" "}
            {row.contactPhone} / {row.contactEmail}
          </p>
          <div className="space-y-1 rounded-md border border-matchon-border bg-matchon-surface p-3">
            <p className="font-semibold">계정 정보</p>
            <p className="break-all">
              <span className="font-semibold">신청 로그인 아이디</span>:{" "}
              {display.requestedLoginIdLabel}
            </p>
            <p className="break-all">
              <span className="font-semibold">현재 로그인 아이디</span>:{" "}
              {display.currentLoginIdLabel}
            </p>
            <p>
              <span className="font-semibold">이메일</span>: {row.contactEmail}
            </p>
            <p>
              <span className="font-semibold">연락처</span>: {row.contactPhone}
            </p>
            <p>
              <span className="font-semibold">계정 상태</span>:{" "}
              {display.accountStatusLabel}
            </p>
            {display.mismatchWarning ? (
              <p className="text-xs text-amber-800">{display.mismatchWarning}</p>
            ) : null}
          </div>
          <p>
            <span className="font-semibold">주소:</span>{" "}
            {formatPostalAddress({
              postalCode: row.postalCode,
              address: row.address,
              addressDetail: row.addressDetail,
            }) || "확인 불가"}
          </p>
          <p>
            <span className="font-semibold">웹사이트:</span> {row.website || "확인 불가"}
          </p>
          <p className="whitespace-pre-wrap">
            <span className="font-semibold">소개:</span>
            <br />
            {row.description || "확인 불가"}
          </p>
          <AssociationApplicationAttachmentsList
            attachments={row.attachments.map((a) => ({
              id: a.id,
              attachmentType: a.attachmentType,
              originalFileName: a.originalFileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            }))}
          />
          <AssociationApplicationReviewActions
            applicationId={row.id}
            canReview={
              row.status === "pending" || row.status === "under_review"
            }
          />
          {row.status === "approved" && row.createdOrganizerId ? (
            <p>
              <Link
                href={`/admin/associations/${row.createdOrganizerId}`}
                className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                협회 상세 보기 →
              </Link>
            </p>
          ) : null}
          <p>
            <Link
              href="/admin/association-applications"
              className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              ← 목록
            </Link>
          </p>
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
