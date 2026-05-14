import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { applicationService } from "@/lib/services/application.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterEventsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["fighter", "admin"]);

  const rows = await applicationService.listFighterLinkedApplications(actor);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          내 신청 대회
        </h1>
        <p className="text-muted-foreground text-sm">
          체육관 계정으로 제출된 대회 신청이 연결된 선수 프로필에 표시됩니다. 입금
          계좌 등 세부 안내는 소속 체육관에서 확인해 주세요.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="표시할 신청이 없습니다"
          description="선수 프로필이 이 계정에 연결되어 있고, 체육관이 대회에 신청한 경우에만 목록이 나타납니다."
          action={
            <Link href="/fighter" className={cn(buttonVariants({ size: "sm" }))}>
              선수 홈으로
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <article className="ring-foreground/10 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="truncate font-semibold">{r.eventTitle}</div>
                  <div className="text-muted-foreground text-xs">
                    {r.divisionLabel}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    신청 {r.fighterName} · 접수{" "}
                    {r.appliedAt
                      ? new Date(r.appliedAt).toLocaleDateString("ko-KR")
                      : "—"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={r.applicationStatus} />
                  <PaymentStatusBadge status={r.paymentStatus} />
                  <Link
                    href={`/events/${r.eventSlug}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    공개 공고
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
