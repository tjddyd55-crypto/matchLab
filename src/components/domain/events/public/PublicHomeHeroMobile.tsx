import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeHeroMobile() {
  return (
    <section className="border-b bg-gradient-to-b from-primary/5 to-background px-4 py-8 md:hidden">
      <div className="space-y-3">
        <p className="text-primary text-xs font-semibold tracking-wide">
          MatchLab
        </p>
        <h1 className="font-heading text-2xl font-semibold leading-tight">
          대회 공고
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          포스터로 대회를 확인하고 체육관 계정으로 신청하세요.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Link href="/events" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            진행 중인 대회 보기
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            체육관 로그인
          </Link>
        </div>
      </div>
    </section>
  );
}
