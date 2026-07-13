import Link from "next/link";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const heroGradientClass =
  "bg-[linear-gradient(170deg,#001C7A_6%,#0A47FF_54%,#3D7AFF_94%)]";

export function PublicHomeHeroDesktop() {
  return (
    <section className={cn("relative hidden overflow-hidden md:block", heroGradientClass)}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background:radial-gradient(circle_at_center,white,transparent_70%)]" />
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "relative flex flex-col items-center py-[72px] text-center",
        )}
      >
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-xs font-bold tracking-wide text-white/85">
          격투기 대회 운영 플랫폼
        </div>

        <h1 className="max-w-3xl font-black text-[52px] leading-[1.1] tracking-[-2.08px] text-white">
          격투기 대회를
          <br />
          <span className="text-white/70">더 스마트하게</span>
        </h1>

        <p className="mt-5 max-w-[520px] text-lg leading-relaxed text-white/72">
          신청·대진표·심판 채점·결과 관리까지
          <br />
          대회 운영의 모든 것을 하나의 플랫폼에서
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/events"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-xl bg-white px-7 text-[15px] font-extrabold text-matchon-primary hover:bg-white/95",
            )}
          >
            대회 공고 보기
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 rounded-xl border-white/30 bg-transparent px-6 text-[15px] font-bold text-white hover:bg-white/10 hover:text-white",
            )}
          >
            주최자로 시작하기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
