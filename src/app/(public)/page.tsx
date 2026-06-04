import Link from "next/link";
import { PublicEventCard } from "@/components/domain/events/PublicEventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { eventService } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const events = await eventService.listPublicEvents();
  const featured = events
    .filter(
      (e) =>
        e.registrationStatus === "open" ||
        e.status === "open" ||
        e.status === "ongoing" ||
        e.status === "bracket_ready",
    )
    .slice(0, 6);

  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 md:px-6 md:py-16">
          <div className="max-w-2xl space-y-4">
            <p className="text-primary text-sm font-medium tracking-wide">
              MatchLab
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              대회 공고 · 신청 · 현장 정보
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
              참가 가능한 대회를 포스터와 함께 확인하고, 체육관 계정으로 선수
              신청을 진행할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/events" className={cn(buttonVariants({ size: "lg" }))}>
                진행 중인 대회 보기
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                체육관 로그인
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">대회 공고</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              최신 공개 대회를 포스터와 함께 확인하세요.
            </p>
          </div>
          <Link
            href="/events"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            전체 보기
          </Link>
        </div>

        {featured.length === 0 ? (
          <EmptyState
            title="표시할 대회 공고가 없습니다"
            description="공개된 대회가 등록되면 여기에 포스터 카드가 표시됩니다."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e, i) => (
              <PublicEventCard key={e.id} event={e} priorityImage={i < 3} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
