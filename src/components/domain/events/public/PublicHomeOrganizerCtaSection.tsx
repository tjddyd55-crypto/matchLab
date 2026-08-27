import Link from "next/link";
import { PublicManagerDownloadButton } from "@/components/domain/events/public/PublicManagerDownloadButton";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { buttonVariants } from "@/components/ui/button";
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
          이제 대회 운영을
          <br />
          더 간단하게 시작하세요
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">
          웹에서 준비하고, 현장에서는 MATCHON Manager로 이어서 운영하세요.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-[15px] font-extrabold text-matchon-primary hover:bg-white/95",
            )}
          >
            웹에서 시작하기
          </Link>
          <PublicManagerDownloadButton
            download={download}
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            label="MATCHON Manager 다운로드"
          />
        </div>
      </div>
    </section>
  );
}
