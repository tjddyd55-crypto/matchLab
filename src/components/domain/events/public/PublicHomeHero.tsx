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
            격투기 대회 운영 플랫폼
          </p>
          <h1 className="mt-3 max-w-[18ch] font-black text-[32px] leading-[1.15] tracking-tight text-matchon-text-primary sm:text-[40px] md:text-[48px] lg:text-[52px]">
            참가 신청부터 경기 운영까지
            <span className="mt-1 block text-matchon-primary-dark">
              MATCHON 하나로
            </span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-matchon-text-secondary md:text-lg">
            선수 신청, 계체, 대진 편성, 경기 진행과 결과 관리까지
            대회 운영에 필요한 과정을 한곳에서 관리하세요.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex h-12 w-full items-center justify-center rounded-xl bg-matchon-primary px-7 text-[15px] font-extrabold text-white hover:bg-matchon-primary/90 sm:w-auto",
              )}
            >
              웹에서 시작하기
            </Link>
            <PublicManagerDownloadButton
              download={download}
              className="w-full sm:w-auto"
              label="MATCHON Manager 다운로드"
            />
          </div>
          <p className="mt-3 text-[13px] font-medium text-matchon-text-secondary">
            Windows용 PC 프로그램
            {download ? ` · v${download.version}` : null}
          </p>
        </div>

        <div className="min-w-0">
          <PublicHomeProductVisual />
        </div>
      </div>
    </section>
  );
}
