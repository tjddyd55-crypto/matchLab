import { Download } from "lucide-react";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHomeManagerDownloadSection({
  download,
}: {
  download: MatchonManagerDownloadInfo;
}) {
  return (
    <section
      id="download"
      aria-labelledby="home-manager-download-title"
      className="border-y border-matchon-border bg-matchon-primary-light/25 py-10 md:py-12"
    >
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS)}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
              프로그램 다운로드
            </p>
            <h2
              id="home-manager-download-title"
              className="font-black text-[24px] tracking-tight text-matchon-text-primary md:text-[28px]"
            >
              {download.productName} 다운로드
            </h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-matchon-text-secondary">
              PC에서 대회 운영을 더 편리하게 관리하세요.
            </p>
            <p className="text-[13px] font-medium text-matchon-text-secondary">
              {download.osLabel} · v{download.version}
            </p>
          </div>

          <div className="flex w-full shrink-0 md:w-auto md:justify-end">
            <a
              href={download.downloadUrl}
              download={download.fileName}
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex h-12 w-full min-w-[220px] items-center justify-center gap-2 rounded-xl bg-matchon-primary px-6 text-[15px] font-extrabold text-white hover:bg-matchon-primary/90 md:w-auto",
              )}
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Windows용 다운로드
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
