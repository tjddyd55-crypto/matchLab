import Link from "next/link";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const heroGradientClass =
  "bg-[linear-gradient(170deg,#001C7A_6%,#0A47FF_54%,#3D7AFF_94%)]";

export function PublicHomeHeroMobile() {
  return (
    <section className={cn("relative overflow-hidden py-10 md:hidden", heroGradientClass)}>
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "relative space-y-4 text-center text-white",
        )}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-bold text-white/85">
          격투기 대회 운영 플랫폼
        </div>
        <h1 className="font-black text-3xl leading-tight tracking-tight">
          격투기 대회를
          <br />
          <span className="text-white/70">더 스마트하게</span>
        </h1>
        <p className="text-sm leading-relaxed text-white/72">
          신청·대진표·심판 채점·결과 관리까지 한 곳에서
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/events"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full rounded-xl bg-white font-extrabold text-matchon-primary hover:bg-white/95",
            )}
          >
            대회 공고 보기
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full rounded-xl border-white/30 bg-transparent font-bold text-white hover:bg-white/10 hover:text-white",
            )}
          >
            주최자로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
