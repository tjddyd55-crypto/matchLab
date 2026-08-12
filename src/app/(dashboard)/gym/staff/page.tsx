import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { formatPhoneNumber } from "@/lib/phone";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGrid4Class } from "@/lib/ui/event-management-ui";
import {
  matchonCompactActionBarClass,
  matchonCompactTableWrapClass,
  matchonFieldInputClass,
  matchonFilterBarClass,
  matchonMobileCardListClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = { q?: string; includeInactive?: string };

export default async function GymStaffListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const q = sp.q?.trim() || undefined;
  const includeInactive = sp.includeInactive === "true";

  let summary;
  let list;
  try {
    [summary, list] = await Promise.all([
      gymStaffService.getSummary(actor),
      gymStaffService.listStaff(actor, { q, includeInactive }),
    ]);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>선생님 목록</h1>
          <p className={matchonPageDescClass}>
            선생님을 등록하고 로그인 계정·담당 회원을 관리합니다.
          </p>
        </div>

        <div className={eventManagementStatGrid4Class}>
          <MatchonStatCardButton label="전체" value={summary.total} />
          <MatchonStatCardButton label="재직 중" value={summary.active} />
          <MatchonStatCardButton
            label="계정 사용"
            value={summary.withAccount}
          />
          <MatchonStatCardButton
            label="계정 미설정"
            value={summary.withoutAccount}
          />
        </div>

        <div className={matchonCompactActionBarClass}>
          <Link
            href="/gym/staff/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            선생님 등록
          </Link>
        </div>

        <form method="get" className={cn(matchonFilterBarClass, "space-y-3")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">검색</span>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="이름, 연락처"
                className={matchonFieldInputClass}
              />
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="includeInactive"
                value="true"
                defaultChecked={includeInactive}
                className="mb-3"
              />
              <span className="mb-2.5 font-medium">퇴사자 포함</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
              필터 적용
            </button>
            <Link
              href="/gym/staff"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              초기화
            </Link>
          </div>
        </form>

        {list.items.length === 0 ? (
          <MatchonEmptyState
            title="선생님이 없습니다"
            description="선생님을 등록하면 로그인 계정과 담당 회원을 관리할 수 있습니다."
            action={
              <Link
                href="/gym/staff/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                선생님 등록
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-sm text-matchon-text-secondary">
              총 {list.total}명
            </p>

            <div className={matchonMobileCardListClass}>
              {list.items.map((staff) => (
                <Link
                  key={staff.id}
                  href={`/gym/staff/${staff.id}`}
                  className="block space-y-2 rounded-xl border border-matchon-border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-matchon-text-primary">
                        {staff.name}
                      </p>
                      <p className="text-xs text-matchon-text-secondary">
                        {staff.staffRoleLabel}
                        {staff.title ? ` · ${staff.title}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-matchon-primary">
                      {staff.hasAccount ? "계정 사용 중" : "계정 미설정"}
                    </span>
                  </div>
                  <p className="text-sm text-matchon-text-secondary">
                    {formatPhoneNumber(staff.phone)}
                  </p>
                  <p className="text-xs text-matchon-text-secondary">
                    담당 회원 {staff.assignedMemberCount}명
                    {staff.isActive ? "" : " · 퇴사"}
                  </p>
                </Link>
              ))}
            </div>

            <div className={matchonCompactTableWrapClass}>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-matchon-border bg-matchon-surface/50 text-xs font-medium text-matchon-text-secondary">
                  <tr>
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">직무</th>
                    <th className="px-3 py-2">연락처</th>
                    <th className="px-3 py-2">계정</th>
                    <th className="px-3 py-2">담당 회원</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-b border-matchon-border last:border-0"
                    >
                      <td className="px-3 py-3 font-medium">{staff.name}</td>
                      <td className="px-3 py-3">
                        {staff.staffRoleLabel}
                        {staff.title ? (
                          <span className="mt-0.5 block text-xs text-matchon-text-secondary">
                            {staff.title}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatPhoneNumber(staff.phone)}
                      </td>
                      <td className="px-3 py-3">
                        {staff.hasAccount ? (
                          <span className="font-mono text-xs">
                            {staff.loginId}
                          </span>
                        ) : (
                          <span className="text-xs text-matchon-text-secondary">
                            미설정
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {staff.assignedMemberCount}명
                      </td>
                      <td className="px-3 py-3">
                        {staff.isActive ? "재직" : "퇴사"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/gym/staff/${staff.id}`}
                          className="text-xs font-semibold text-matchon-primary underline"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
