import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPasswordResetLinkPanel } from "@/components/domain/admin/AdminPasswordResetLinkPanel";
import { AdminSupportInquiryStatusForm } from "@/components/domain/admin/AdminSupportInquiryStatusForm";
import { requireActor } from "@/lib/auth/actor";
import {
  DESKTOP_SUPPORT_CATEGORY_LABELS,
  DESKTOP_SUPPORT_STATUS_LABELS,
} from "@/lib/desktop/support-inquiry";
import { AppError } from "@/lib/errors/app-error";
import { DesktopSupportInquiryCategory } from "@/lib/enums";
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

  const isPasswordHelp =
    row.category === DesktopSupportInquiryCategory.password_help;

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
          <p>
            <span className="font-semibold">아이디</span>: {row.loginId ?? "-"}
          </p>
          <p>
            <span className="font-semibold">연락처</span>: {row.contact}
          </p>
          <p>
            <span className="font-semibold">앱 버전</span>:{" "}
            {row.appVersion ? `v${row.appVersion}` : "-"}
          </p>
          <p>
            <span className="font-semibold">source / roleHint</span>: {row.source}{" "}
            / {row.roleHint ?? "-"}
          </p>
          <p>
            <span className="font-semibold">접수</span>:{" "}
            {row.createdAt.toISOString()}
          </p>
          <div>
            <p className="mb-1 font-semibold">내용</p>
            <p className="whitespace-pre-wrap rounded-md bg-matchon-surface p-3">
              {row.message}
            </p>
          </div>
        </div>

        {isPasswordHelp && adminResetEnabled ? (
          <div className={adminContentCardClass}>
            <AdminPasswordResetLinkPanel
              initialLoginId={row.loginId ?? ""}
              inquiryId={row.id}
              inquiryConnected
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
