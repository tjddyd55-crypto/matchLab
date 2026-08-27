import Link from "next/link";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { BRAND_DESCRIPTION } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-matchon-sidebar text-white">
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "py-10 md:py-12")}>
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <MatchonLogo variant="dark" size="sm" />
            <p className="max-w-xs text-[13px] leading-relaxed text-white/45">
              {BRAND_DESCRIPTION}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.66px] text-white/35">
              서비스
            </p>
            <nav className="flex flex-col gap-2" aria-label="푸터 서비스">
              <Link
                href="/#features"
                className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/70"
              >
                기능 소개
              </Link>
              <Link
                href="/#manager"
                className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/70"
              >
                MATCHON Manager
              </Link>
              <Link
                href="/events"
                className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/70"
              >
                대회 공고
              </Link>
              <Link
                href="/join"
                className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/70"
              >
                회원가입
              </Link>
              <Link
                href="/login"
                className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/70"
              >
                로그인
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.66px] text-white/35">
              문의
            </p>
            <div className="text-[13px] leading-relaxed text-white/45">
              <p>대회 운영 문의</p>
              <p>contact@matchon.kr</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/8 pt-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MATCHON. All rights reserved.</p>
          <p>격투기 대회 운영 플랫폼</p>
        </div>
      </div>
    </footer>
  );
}
