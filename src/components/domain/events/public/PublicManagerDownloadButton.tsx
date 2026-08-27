import { Download } from "lucide-react";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function WindowsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M0 2.2 6.6 1.3v6.1H0V2.2Zm7.4-.9L16 0v7.4H7.4V1.3ZM0 8.7h6.6v6.1L0 13.8V8.7Zm7.4 0H16V16l-8.6-1.2V8.7Z"
      />
    </svg>
  );
}

export function PublicManagerDownloadButton({
  download,
  className,
  size = "lg",
  label = "MATCHON Manager 다운로드",
  showVersion = false,
}: {
  download: MatchonManagerDownloadInfo | null;
  className?: string;
  size?: "default" | "sm" | "lg";
  label?: string;
  showVersion?: boolean;
}) {
  if (!download) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "outline", size }),
          "pointer-events-none inline-flex h-12 items-center justify-center gap-2 rounded-xl border-matchon-border px-6 text-[15px] font-bold text-matchon-text-secondary opacity-70",
          className,
        )}
        aria-disabled
      >
        <Download className="size-4 shrink-0" aria-hidden />
        다운로드 준비 중
      </span>
    );
  }

  return (
    <a
      href={download.downloadUrl}
      download={download.fileName}
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl border-matchon-border bg-white px-6 text-[15px] font-bold text-matchon-text-primary hover:bg-matchon-primary-light/60",
        className,
      )}
      aria-label={`${label} (${download.osLabel}${showVersion ? `, v${download.version}` : ""})`}
    >
      <WindowsMark className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
      {showVersion ? (
        <span className="hidden text-xs font-semibold text-matchon-text-secondary sm:inline">
          v{download.version}
        </span>
      ) : null}
    </a>
  );
}
