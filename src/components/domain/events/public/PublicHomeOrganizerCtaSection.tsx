import { PublicManagerDownloadButton } from "@/components/domain/events/public/PublicManagerDownloadButton";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { cn } from "@/lib/utils";

export function PublicHomeOrganizerCtaSection({
  download,
}: {
  download: MatchonManagerDownloadInfo | null;
}) {
  return (
    <section
      aria-labelledby="home-final-cta-title"
      className="border-t border-matchon-border bg-matchon-primary-dark py-14 md:py-16"
    >
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "mx-auto max-w-[640px] text-center text-white",
        )}
      >
        <h2
          id="home-final-cta-title"
          className="font-black text-[28px] tracking-tight md:text-[32px]"
        >
          체육관 관리와 대회 운영을
          <br />
          MATCHON Manager로 시작하세요
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">
          Windows용 PC 프로그램을 설치한 뒤, 프로그램에서 운영을 시작하세요.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <PublicManagerDownloadButton
            download={download}
            className="h-12 justify-center border-transparent bg-white px-6 text-[15px] font-extrabold text-matchon-primary hover:bg-white/95 hover:text-matchon-primary"
            label="MATCHON Manager 다운로드"
            showVersion
          />
        </div>
        <p className="mt-3 text-[13px] text-white/55">Windows용 PC 프로그램</p>
      </div>
    </section>
  );
}
