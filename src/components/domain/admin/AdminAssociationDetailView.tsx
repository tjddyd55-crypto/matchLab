import Link from "next/link";
import type { AdminAssociationDetailDTO } from "@/lib/dto/admin";
import { AdminOrganizationAuditList } from "@/components/domain/admin/AdminOrganizationAuditList";
import { AdminOrganizationCreditPanel } from "@/components/domain/admin/AdminOrganizationCreditPanel";
import { AdminOrganizationHeader } from "@/components/domain/admin/AdminOrganizationHeader";
import {
  AdminOrganizationStatusHint,
  AdminOrganizationSuspendedBanner,
} from "@/components/domain/admin/AdminOrganizationSuspendedBanner";
import {
  AdminOrganizationStatusPanel,
} from "@/components/domain/admin/AdminOrganizationStatusPanel";
import { canManageOrganizationStatus } from "@/lib/organization-platform-status";
import { AdminOrganizationSummary } from "@/components/domain/admin/AdminOrganizationSummary";
import { AdminOrganizationTabs } from "@/components/domain/admin/AdminOrganizationTabs";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { formatStoredAdminLoginId } from "@/lib/admin/admin-login-id-label";
import {
  adminContentCardClass,
  adminMutedTextClass,
  getAdminOrganizerStatusLabel,
  resolveAdminOrganizerStatusMatchon,
} from "@/lib/ui/admin-ui";

const TABS = [
  { id: "overview", label: "기본정보" },
  { id: "gyms", label: "체육관" },
  { id: "events", label: "대회" },
  { id: "credit", label: "크레딧" },
  { id: "audit", label: "운영기록" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function resolveTab(raw: string | undefined): TabId {
  const found = TABS.find((t) => t.id === raw);
  return found?.id ?? "overview";
}

export function AdminAssociationDetailView({
  detail,
  tabParam,
}: {
  detail: AdminAssociationDetailDTO;
  tabParam?: string;
}) {
  const tab = resolveTab(tabParam);
  const baseHref = `/admin/associations/${detail.id}`;
  const app = detail.application;

  return (
    <div className="space-y-4">
      <AdminOrganizationHeader
        title={detail.name}
        statusLabel={getAdminOrganizerStatusLabel(detail.status)}
        statusMatchon={resolveAdminOrganizerStatusMatchon(detail.status)}
        metaLines={[
          `대표자 ${app?.representativeName ?? detail.ownerName}`,
          `가입일 ${formatAdminDateTime(detail.createdAt)}`,
        ]}
        statusActions={
          canManageOrganizationStatus("association", detail.status) ? (
            <AdminOrganizationStatusPanel
              kind="association"
              organizationId={detail.id}
              organizationName={detail.name}
              currentStatus={detail.status}
              statusLabel={getAdminOrganizerStatusLabel(detail.status)}
              canManage
            />
          ) : null
        }
        actions={
          <Link
            href="/admin/associations"
            className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 협회 목록
          </Link>
        }
      />

      <AdminOrganizationSuspendedBanner
        status={detail.status}
        kind="association"
      />
      <AdminOrganizationStatusHint status={detail.status} />

      <AdminOrganizationSummary
        items={[
          {
            label: "연결 체육관",
            value: String(detail.summary.memberGymCount),
          },
          { label: "대회", value: String(detail.summary.eventCount) },
          {
            label: "크레딧",
            value: `${detail.summary.creditBalance.toLocaleString("ko-KR")}C`,
          },
        ]}
      />

      <AdminOrganizationTabs
        baseHref={baseHref}
        activeTab={tab}
        tabs={[...TABS]}
      />

      <div className={adminContentCardClass}>
        {tab === "overview" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className={adminMutedTextClass}>협회명</dt>
              <dd className="font-medium">{detail.name}</dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>상태</dt>
              <dd className="font-medium">
                {getAdminOrganizerStatusLabel(detail.status)}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>대표자</dt>
              <dd className="font-medium">
                {app?.representativeName ?? detail.ownerName}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>연락처</dt>
              <dd className="font-medium">
                {app?.contactPhone ?? detail.ownerPhone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>이메일</dt>
              <dd className="font-medium break-all">
                {app?.contactEmail ?? detail.ownerEmail ?? "—"}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>로그인 아이디</dt>
              <dd className="font-mono text-xs break-all">
                {formatStoredAdminLoginId(detail.loginId)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={adminMutedTextClass}>주소</dt>
              <dd className="font-medium">{app?.addressLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>웹사이트</dt>
              <dd className="font-medium break-all">
                {detail.websiteUrl || "—"}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>가입일</dt>
              <dd className="font-medium">
                {formatAdminDateTime(detail.createdAt)}
              </dd>
            </div>
            {app ? (
              <>
                <div>
                  <dt className={adminMutedTextClass}>신청 제출</dt>
                  <dd className="font-medium">
                    {formatAdminDateTime(app.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className={adminMutedTextClass}>승인 시각</dt>
                  <dd className="font-medium">
                    {app.reviewedAt
                      ? formatAdminDateTime(app.reviewedAt)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className={adminMutedTextClass}>가입 신청</dt>
                  <dd>
                    <Link
                      href={`/admin/association-applications/${app.id}`}
                      className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                    >
                      신청 상세 보기
                    </Link>
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        ) : null}

        {tab === "gyms" ? (
          <div className="space-y-2">
            <p className={`${adminMutedTextClass} text-sm`}>
              협회–체육관은 M:N 회원 연결입니다. 소유 관계가 아닙니다.
            </p>
            {detail.linkedGyms.length === 0 ? (
              <p className={`${adminMutedTextClass} text-sm`}>
                연결된 체육관이 없습니다.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-matchon-border text-sm">
                {detail.linkedGyms.map((g) => (
                  <li
                    key={g.membershipId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div>
                      <Link
                        href={`/admin/gyms/${g.gymId}`}
                        className="font-medium text-matchon-primary underline-offset-2 hover:underline"
                      >
                        {g.gymName}
                      </Link>
                      <p className={`${adminMutedTextClass} text-xs`}>
                        {g.status} · 코드 {g.memberCode} ·{" "}
                        {formatAdminDateTime(g.joinedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "events" ? (
          detail.events.length === 0 ? (
            <p className={`${adminMutedTextClass} text-sm`}>
              운영한 대회가 없습니다.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border border-matchon-border text-sm">
              {detail.events.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className={`${adminMutedTextClass} text-xs`}>
                      {e.status} · {formatAdminDateTime(e.eventDate)} · 공개
                      슬러그 {e.publicSlug}
                    </p>
                  </div>
                  <Link
                    href={`/admin/events`}
                    className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
                  >
                    대회 목록
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "credit" ? (
          <AdminOrganizationCreditPanel
            organizerId={detail.id}
            organizerName={detail.name}
            balance={detail.summary.creditBalance}
            ledgers={detail.creditLedgers}
          />
        ) : null}

        {tab === "audit" ? (
          <AdminOrganizationAuditList rows={detail.auditLogs} />
        ) : null}
      </div>
    </div>
  );
}
