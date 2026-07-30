import Link from "next/link";
import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberPortalSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const mode = sp.mode === "past" ? "past" : "upcoming";
  const session = await requireMemberPortalPageSession(token);
  const rows = await gymMemberPortalService.listPersonalSchedules(
    session,
    mode,
  );

  return (
    <MemberPortalAppShell token={token} gymName={session.gymName}>
      <h2 className="text-lg font-bold text-[#001C7A]">내 일정</h2>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/member-portal/${token}/schedule`}
          className={cn(
            "min-h-10 rounded-lg px-3 py-2 text-sm font-medium",
            mode === "upcoming"
              ? "bg-[#EAF1FF] text-[#0A47FF]"
              : "bg-white text-[#64748B] border border-[#E2E8F0]",
          )}
        >
          예정
        </Link>
        <Link
          href={`/member-portal/${token}/schedule?mode=past`}
          className={cn(
            "min-h-10 rounded-lg px-3 py-2 text-sm font-medium",
            mode === "past"
              ? "bg-[#EAF1FF] text-[#0A47FF]"
              : "bg-white text-[#64748B] border border-[#E2E8F0]",
          )}
        >
          지난 일정
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            {mode === "upcoming"
              ? "예정된 개인 일정이 없습니다."
              : "지난 일정이 없습니다."}
          </p>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              <p className="text-xs text-[#64748B]">
                {r.dateKey} · {r.timeRangeLabel}
              </p>
              <p className="mt-1 font-semibold text-[#0F172A] break-keep">
                {r.title}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                {r.instructorName} 선생님
                {r.location ? ` · ${r.location}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-[#001C7A]">
                {r.statusLabel}
              </p>
            </article>
          ))
        )}
      </div>
    </MemberPortalAppShell>
  );
}
