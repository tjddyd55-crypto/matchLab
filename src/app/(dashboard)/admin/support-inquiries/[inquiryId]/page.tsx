import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPasswordResetLinkPanel } from "@/components/domain/admin/AdminPasswordResetLinkPanel";
import { AdminSupportInquiryStatusForm } from "@/components/domain/admin/AdminSupportInquiryStatusForm";
import {
  formatAdminLoginIdLabel,
  resolveAdminAccountIdentityFromInquiry,
} from "@/lib/admin/admin-account-identity";
import { tryResolveAdminResetClientTarget } from "@/lib/admin/try-resolve-admin-reset-target";
import { requireActor } from "@/lib/auth/actor";
import {
  DESKTOP_SUPPORT_CATEGORY_LABELS,
  DESKTOP_SUPPORT_STATUS_LABELS,
} from "@/lib/desktop/support-inquiry";
import { AppError } from "@/lib/errors/app-error";
import { desktopSupportInquiryService } from "@/lib/services/desktop-support-inquiry.service";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminSupportInquiryDetailPage({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const actor = await requireActor();
  const { inquiryId } = await params;
  const adminResetEnabled = loadMatchonAdminPasswordResetLinkConfig().enabled;

  let row;
  try {
    row = await desktopSupportInquiryService.getForAdmin(actor, inquiryId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const identity = await resolveAdminAccountIdentityFromInquiry({
    loginId: row.loginId,
    name: row.name,
    contact: row.contact,
  });
  const loginIdLabel = formatAdminLoginIdLabel(identity);
  const resetTarget = identity.resetEligible
    ? await tryResolveAdminResetClientTarget(actor, identity.userId)
    : null;

  const sourceLabel =
    row.source === "web" ? "웹" : row.roleHint === "desktop_header" ? "Manager" : "Desktop";

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="문의 상세"
          description={`${DESKTOP_SUPPORT_CATEGORY_LABELS[row.category]} · ${DESKTOP_SUPPORT_STATUS_LABELS[row.status]}`}
        />
        <p>
          <Link
            href="/admin/support-inquiries"
            className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 목록
          </Link>
        </p>

        <div className={`${adminContentCardClass} space-y-3 text-sm`}>
          <p>
            <span className="font-semibold">이름</span>: {row.name}
          </p>
          <div className="space-y-1">
            <p className="break-all">
              <span className="font-semibold">로그인 아이디</span>: {loginIdLabel}
            </p>
            {identity.resolutionStatus === "needs_review" &&
            identity.submittedLoginId &&
            !identity.resetEligible ? (
              <p className="text-xs text-amber-800">상태: 계정 확인 필요</p>
            ) : null}
            {identity.resolutionStatus === "ambiguous" ? (
              <p className="text-xs text-amber-800">
                동일한 정보로 여러 계정이 확인되었습니다.
              </p>
            ) : null}
            {identity.resolutionStatus === "unresolved" ? (
              <p className="text-xs text-matchon-text-secondary">
                계정을 자동으로 확인하지 못했습니다.
              </p>
            ) : null}
          </div>
          <p>
            <span className="font-semibold">계정 유형</span>:{" "}
            {identity.accountType === "association"
              ? "협회"
              : identity.accountType === "gym"
                ? "체육관"
                : "확인 불가"}
          </p>
          <p className="break-words">
            <span className="font-semibold">소속 협회 또는 체육관</span>:{" "}
            {identity.accountName ?? "확인 불가"}
          </p>
          <p>
            <span className="font-semibold">연락처</span>: {row.contact}
          </p>
          <p>
            <span className="font-semibold">이메일</span>:{" "}
            {identity.emailMasked ?? "확인 불가"}
          </p>
          <p>
            <span className="font-semibold">앱 버전</span>:{" "}
            {row.appVersion ? `v${row.appVersion}` : "확인 불가"}
          </p>
          <p>
            <span className="font-semibold">접수 경로</span>: {sourceLabel}
            {row.roleHint ? ` · ${row.roleHint}` : ""}
          </p>
          <p>
            <span className="font-semibold">접수일</span>:{" "}
            {row.createdAt.toISOString()}
          </p>
          <div>
            <p className="mb-1 font-semibold">내용</p>
            <p className="whitespace-pre-wrap rounded-md bg-matchon-surface p-3">
              {row.message}
            </p>
          </div>
        </div>

        {adminResetEnabled ? (
          <div className={adminContentCardClass}>
            <AdminPasswordResetLinkPanel
              initialLoginId={identity.loginId ?? identity.submittedLoginId ?? ""}
              initialUserId={identity.resetEligible ? identity.userId : null}
              initialTarget={resetTarget}
              inquiryId={row.id}
              inquiryConnected
              unresolvedHint={identity.hint}
            />
          </div>
        ) : null}

        <div className={adminContentCardClass}>
          <AdminSupportInquiryStatusForm
            inquiryId={row.id}
            currentStatus={row.status}
            currentAdminNote={row.adminNote}
          />
        </div>
      </div>
    </div>
  );
}
