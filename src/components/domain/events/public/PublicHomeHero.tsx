import Link from "next/link";
import { PublicHomeProductVisual } from "@/components/domain/events/public/PublicHomeProductVisual";
import { PublicManagerDownloadButton } from "@/components/domain/events/public/PublicManagerDownloadButton";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeHero({
  download,
}: {
  download: MatchonManagerDownloadInfo | null;
}) {
  return (
    <section className="border-b border-matchon-border bg-matchon-surface">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "grid items-center gap-10 py-12 md:gap-12 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-[72px]",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            격투기 운영 관리 플랫폼
          </p>
          <h1 className="mt-3 max-w-[16ch] font-black text-[32px] leading-[1.15] tracking-tight text-matchon-text-primary sm:text-[40px] md:text-[48px] lg:text-[52px]">
            체육관 관리부터
            <span className="mt-1 block text-matchon-primary-dark">
              격투기 대회 운영까지
            </span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-matchon-text-secondary md:text-lg">
            회원과 선수 관리, 참가 신청, 대진 편성, 경기 운영과 결과 관리까지
            MATCHON 하나로 연결하세요.
          </p>
          <p className="mt-3 max-w-[34rem] text-[14px] font-medium text-matchon-text-secondary">
            MATCHON Manager를 설치하고 하나의 프로그램에서 운영을 시작하세요.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <PublicManagerDownloadButton
              download={download}
              className="h-12 w-full justify-center border-transparent bg-matchon-primary px-7 text-[15px] font-extrabold text-white hover:bg-matchon-primary/90 hover:text-white sm:w-auto"
              label="MATCHON Manager 다운로드"
              showVersion
            />
            <Link
              href="/#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "inline-flex h-12 w-full items-center justify-center rounded-xl border-matchon-border bg-white px-6 text-[15px] font-bold text-matchon-text-primary hover:bg-matchon-primary-light/60 sm:w-auto",
              )}
            >
              주요 기능 보기
            </Link>
          </div>
          <p className="mt-3 text-[13px] font-medium text-matchon-text-secondary">
            Windows용 PC 프로그램
            {download ? ` · v${download.version}` : null}
          </p>
        </div>

        <div className="min-w-0 pb-2 lg:min-h-[360px]">
          <PublicHomeProductVisual />
        </div>
      </div>
    </section>
  );
}
