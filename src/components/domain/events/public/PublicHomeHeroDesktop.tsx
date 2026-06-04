import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeHeroDesktop() {
  return (
    <section className="hidden border-b bg-gradient-to-b from-primary/8 via-background to-background md:block">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 lg:py-20">
        <div className="max-w-3xl space-y-5">
          <p className="text-primary text-sm font-semibold tracking-wide">
            MatchLab
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight lg:text-5xl">
            대회 공고 · 신청 · 현장 정보
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            참가 가능한 대회를 포스터와 함께 확인하고, 체육관 계정으로 선수
            신청을 진행할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
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
  );
}
