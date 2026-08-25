import Link from "next/link";
import type { AdminGymDetailDTO } from "@/lib/dto/admin";
import { AdminOrganizationAuditList } from "@/components/domain/admin/AdminOrganizationAuditList";
import { AdminOrganizationHeader } from "@/components/domain/admin/AdminOrganizationHeader";
import {
  AdminOrganizationStatusHint,
  AdminOrganizationSuspendedBanner,
} from "@/components/domain/admin/AdminOrganizationSuspendedBanner";
import {
  AdminOrganizationStatusPanel,
  canManageOrganizationStatus,
} from "@/components/domain/admin/AdminOrganizationStatusPanel";
import { AdminOrganizationSummary } from "@/components/domain/admin/AdminOrganizationSummary";
import { AdminOrganizationTabs } from "@/components/domain/admin/AdminOrganizationTabs";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { formatStoredAdminLoginId } from "@/lib/admin/admin-login-id-label";
import {
  adminContentCardClass,
  adminMutedTextClass,
  getAdminGymStatusLabel,
  resolveAdminGymStatusMatchon,
} from "@/lib/ui/admin-ui";

const TABS = [
  { id: "overview", label: "기본정보" },
  { id: "members", label: "회원/선수" },
  { id: "associations", label: "협회 연결" },
  { id: "events", label: "대회 참가" },
  { id: "credit", label: "크레딧" },
  { id: "audit", label: "운영기록" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function resolveTab(raw: string | undefined): TabId {
  const found = TABS.find((t) => t.id === raw);
  return found?.id ?? "overview";
}

export function AdminGymDetailView({
  detail,
  tabParam,
}: {
  detail: AdminGymDetailDTO;
  tabParam?: string;
}) {
  const tab = resolveTab(tabParam);
  const baseHref = `/admin/gyms/${detail.id}`;
  const app = detail.application;

  return (
    <div className="space-y-4">
      <AdminOrganizationHeader
        title={detail.name}
        statusLabel={getAdminGymStatusLabel(detail.status)}
        statusMatchon={resolveAdminGymStatusMatchon(detail.status)}
        metaLines={[
          `대표자 ${app?.representativeName ?? detail.ownerName}`,
          `가입일 ${formatAdminDateTime(detail.createdAt)}`,
        ]}
        statusActions={
          canManageOrganizationStatus("gym", detail.status) ? (
            <AdminOrganizationStatusPanel
              kind="gym"
              organizationId={detail.id}
              organizationName={detail.name}
              currentStatus={detail.status}
              statusLabel={getAdminGymStatusLabel(detail.status)}
              canManage
            />
          ) : null
        }
        actions={
          <Link
            href="/admin/gyms"
            className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 체육관 목록
          </Link>
        }
      />

      <AdminOrganizationSuspendedBanner status={detail.status} kind="gym" />
      <AdminOrganizationStatusHint status={detail.status} />

      <AdminOrganizationSummary
        items={[
          { label: "회원", value: String(detail.summary.memberCount) },
          { label: "선수", value: String(detail.summary.fighterCount) },
          {
            label: "협회 연결",
            value: String(detail.summary.associationLinkCount),
          },
          {
            label: "대회 참가",
            value: String(detail.summary.eventParticipationCount),
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
              <dt className={adminMutedTextClass}>체육관명</dt>
              <dd className="font-medium">{detail.name}</dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>상태</dt>
              <dd className="font-medium">
                {getAdminGymStatusLabel(detail.status)}
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
                {app?.mobilePhone ?? detail.phone ?? detail.ownerPhone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>이메일</dt>
              <dd className="font-medium break-all">
                {app?.email ?? detail.ownerEmail ?? "—"}
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
              <dd className="font-medium">
                {app?.addressLabel ?? detail.address ?? "—"}
              </dd>
            </div>
            <div>
              <dt className={adminMutedTextClass}>사업자번호</dt>
              <dd className="font-medium">{app?.businessNo ?? "—"}</dd>
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
                      href={`/admin/gym-applications/${app.id}`}
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

        {tab === "members" ? (
          <div className="space-y-3 text-sm">
            <p>
              회원 {detail.summary.memberCount}명 · 선수{" "}
              {detail.summary.fighterCount}명
            </p>
            <p className={adminMutedTextClass}>
              Super Admin에서는 일상 GymMember 편집 UI를 복제하지 않습니다.
              선수 목록은 기존 관리 화면에서 확인하세요.
            </p>
            <Link
              href="/admin/fighters"
              className="inline-block font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              선수 목록 보기
            </Link>
          </div>
        ) : null}

        {tab === "associations" ? (
          <div className="space-y-2">
            <p className={`${adminMutedTextClass} text-sm`}>
              협회–체육관 M:N 연결입니다.
            </p>
            {detail.associationLinks.length === 0 ? (
              <p className={`${adminMutedTextClass} text-sm`}>
                연결된 협회가 없습니다.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-matchon-border text-sm">
                {detail.associationLinks.map((a) => (
                  <li
                    key={a.membershipId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div>
                      <Link
                        href={`/admin/associations/${a.organizerId}`}
                        className="font-medium text-matchon-primary underline-offset-2 hover:underline"
                      >
                        {a.associationName}
                      </Link>
                      <p className={`${adminMutedTextClass} text-xs`}>
                        {a.status} · {formatAdminDateTime(a.joinedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "events" ? (
          detail.eventParticipations.length === 0 ? (
            <p className={`${adminMutedTextClass} text-sm`}>
              대회 참가 이력이 없습니다.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border border-matchon-border text-sm">
              {detail.eventParticipations.map((e) => (
                <li key={e.eventId} className="px-3 py-2">
                  <p className="font-medium">{e.eventTitle}</p>
                  <p className={`${adminMutedTextClass} text-xs`}>
                    {e.eventStatus} · {formatAdminDateTime(e.eventDate)} · 신청{" "}
                    {e.applicationCount}건
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "credit" ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">체육관 전용 Credit wallet 없음</p>
            <p className={adminMutedTextClass}>
              플랫폼 크레딧(manual_charge)은 Organizer(협회·주최자) wallet에만
              존재합니다. 체육관 상세에서는 잔액·충전 UI를 위장하지 않습니다.
            </p>
            {detail.associationLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">연결된 협회 크레딧으로 이동</p>
                <ul className="space-y-1">
                  {detail.associationLinks.map((a) => (
                    <li key={a.membershipId}>
                      <Link
                        href={`/admin/associations/${a.organizerId}?tab=credit`}
                        className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                      >
                        {a.associationName} 크레딧
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Link
                href="/admin/credits"
                className="inline-block font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                전체 크레딧 관리
              </Link>
            )}
          </div>
        ) : null}

        {tab === "audit" ? (
          <AdminOrganizationAuditList rows={detail.auditLogs} />
        ) : null}
      </div>
    </div>
  );
}
