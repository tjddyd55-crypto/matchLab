import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberRegistrationRequestStatus } from "@/lib/enums";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatSeoulDateTime } from "@/lib/gym-attendance/seoul-date";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<GymMemberRegistrationRequestStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

export default async function GymMemberRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;
  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <GymProfileMissingBanner />
      </div>
    );
  }

  const statusRaw = sp.status;
  const status =
    statusRaw === "pending" ||
    statusRaw === "approved" ||
    statusRaw === "rejected"
      ? statusRaw
      : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const list = await gymMemberSelfRegistrationService.listRequests(actor, {
    status,
    page,
  });

  return (
    <div className={cn(matchonPageContainerClass, "bg-matchon-surface")}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title="회원 등록 요청"
          description="셀프등록 신청을 검토하고 기존 회원 SSOT로 승인합니다."
          actions={
            <Link
              href="/gym/members"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
            >
              회원관리
            </Link>
          }
        />
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { id: "all", label: "전체" },
            { id: "pending", label: "대기" },
            { id: "approved", label: "승인" },
            { id: "rejected", label: "반려" },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={
                tab.id === "all"
                  ? "/gym/members/registrations"
                  : `/gym/members/registrations?status=${tab.id}`
              }
              className={cn(
                "min-h-10 rounded-lg border px-3 py-2",
                (status ?? "all") === tab.id
                  ? "border-matchon-primary font-semibold"
                  : "border-matchon-border",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {list.rows.length === 0 ? (
          <p className="rounded-xl border border-matchon-border bg-white p-6 text-sm text-matchon-text-secondary">
            등록 요청이 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-matchon-border bg-white">
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-slate-50 text-left text-xs text-matchon-text-secondary">
                <tr>
                  <th className="px-3 py-2">신청일</th>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">연락처</th>
                  <th className="px-3 py-2">생년월일</th>
                  <th className="px-3 py-2">건강확인</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row) => (
                  <tr key={row.id} className="border-t border-matchon-border">
                    <td className="px-3 py-2">
                      {formatSeoulDateTime(row.submittedAt)}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">
                      {formatPhoneNumber(row.phone) || row.phone}
                    </td>
                    <td className="px-3 py-2">
                      {formatUtcDateOnly(row.birthDate)}
                    </td>
                    <td className="px-3 py-2">
                      {row.healthHasAnyYes ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          건강정보 확인 필요
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2">{STATUS_LABEL[row.status]}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/gym/members/registrations/${row.id}`}
                        className="text-matchon-primary"
                      >
                        보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-2 p-3 md:hidden">
              {list.rows.map((row) => (
                <Link
                  key={row.id}
                  href={`/gym/members/registrations/${row.id}`}
                  className="block rounded-xl border border-matchon-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{row.name}</p>
                    <span className="text-xs">{STATUS_LABEL[row.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-matchon-text-secondary">
                    {formatPhoneNumber(row.phone) || row.phone} ·{" "}
                    {formatUtcDateOnly(row.birthDate)}
                  </p>
                  {row.healthHasAnyYes ? (
                    <p className="mt-1 text-xs text-amber-800">
                      건강정보 확인 필요
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
