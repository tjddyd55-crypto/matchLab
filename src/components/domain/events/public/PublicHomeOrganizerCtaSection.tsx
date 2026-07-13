import Link from "next/link";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeOrganizerCtaSection() {
  return (
    <section className="bg-[linear-gradient(171deg,#001C7A_0%,#0A47FF_100%)] py-14">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "mx-auto max-w-[580px] text-center text-white",
        )}
      >
        <h2 className="font-black text-[28px] tracking-tight">
          대회를 직접 주최하고 싶으신가요?
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">
          주최자 계정으로 가입하면 대회 생성부터 대진표 관리, 심판 운영까지
          모든 기능을 사용할 수 있습니다.
        </p>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-7 inline-flex h-12 rounded-xl bg-white px-6 text-[15px] font-extrabold text-matchon-primary hover:bg-white/95",
          )}
        >
          주최자로 시작하기
        </Link>
      </div>
    </section>
  );
}
