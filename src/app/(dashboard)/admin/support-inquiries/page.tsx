import Link from "next/link";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import {
  DESKTOP_SUPPORT_CATEGORY_LABELS,
  DESKTOP_SUPPORT_INQUIRY_CATEGORIES,
  DESKTOP_SUPPORT_INQUIRY_STATUSES,
  DESKTOP_SUPPORT_STATUS_LABELS,
  isDesktopSupportInquiryCategory,
  isDesktopSupportInquiryStatus,
} from "@/lib/desktop/support-inquiry";
import { desktopSupportInquiryService } from "@/lib/services/desktop-support-inquiry.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export const dynamic = "force-dynamic";

export default async function AdminSupportInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;
  const statusFilter =
    sp.status && isDesktopSupportInquiryStatus(sp.status) ? sp.status : "all";
  const categoryFilter =
    sp.category && isDesktopSupportInquiryCategory(sp.category)
      ? sp.category
      : "all";

  const rows = await desktopSupportInquiryService.listForAdmin(actor, {
    status: statusFilter,
    category: categoryFilter,
  });

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="Manager 문의"
          description="MATCHON Manager 비밀번호 찾기·로그인 문의 접수 목록입니다."
        />

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-matchon-border bg-white p-4"
        >
          <label className="space-y-1 text-sm">
            <span className="font-semibold">상태</span>
            <select
              name="status"
              defaultValue={statusFilter}
              className={matchonFieldInputClass}
            >
              <option value="all">전체</option>
              {DESKTOP_SUPPORT_INQUIRY_STATUSES.map((code) => (
                <option key={code} value={code}>
                  {DESKTOP_SUPPORT_STATUS_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">유형</span>
            <select
              name="category"
              defaultValue={categoryFilter}
              className={matchonFieldInputClass}
            >
              <option value="all">전체</option>
              {DESKTOP_SUPPORT_INQUIRY_CATEGORIES.map((code) => (
                <option key={code} value={code}>
                  {DESKTOP_SUPPORT_CATEGORY_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white"
          >
            필터
          </button>
        </form>

        <div className={adminContentCardClass}>
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-matchon-text-primary">
                    {DESKTOP_SUPPORT_CATEGORY_LABELS[row.category]} · {row.name}
                  </p>
                  <p className="text-sm text-matchon-text-secondary">
                    {row.contact}
                    {row.loginId ? ` · 로그인 아이디 ${row.loginId}` : " · 로그인 아이디 확인 불가"}
                    {row.appVersion ? ` · v${row.appVersion}` : ""}
                  </p>
                  <p className="line-clamp-2 text-sm text-matchon-text-primary">
                    {row.message}
                  </p>
                  <p className="text-xs text-matchon-text-secondary">
                    {DESKTOP_SUPPORT_STATUS_LABELS[row.status]} ·{" "}
                    {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
                    UTC · {row.source}
                  </p>
                </div>
                <Link
                  href={`/admin/support-inquiries/${row.id}`}
                  className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
                >
                  상세
                </Link>
              </li>
            ))}
            {rows.length === 0 ? (
              <li className="py-6 text-sm text-matchon-text-secondary">
                접수된 문의가 없습니다.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
