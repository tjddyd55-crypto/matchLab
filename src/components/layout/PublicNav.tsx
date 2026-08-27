import Link from "next/link";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { PublicManagerDownloadButton } from "@/components/domain/events/public/PublicManagerDownloadButton";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { getMatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { cn } from "@/lib/utils";

function safeDownload() {
  try {
    return getMatchonManagerDownloadInfo();
  } catch {
    return null;
  }
}

/**
 * 공개 헤더 SSOT — 서비스 소개 앵커 + Manager 다운로드.
 * 웹 로그인/회원가입 CTA는 노출하지 않는다 (route 자체는 유지).
 */
export function PublicNav() {
  const download = safeDownload();

  return (
    <header className="sticky top-0 z-50 border-b border-matchon-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "flex h-16 items-center justify-between gap-4 py-0 md:h-[68px]",
        )}
      >
        <MatchonLogo href="/" variant="light" size="md" />

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="주요 메뉴"
        >
          <Link
            href="/#features"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            주요 기능
          </Link>
          <Link
            href="/#gym"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            체육관 관리
          </Link>
          <Link
            href="/#features"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            대회 운영
          </Link>
          <Link
            href="/#manager"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            MATCHON Manager
          </Link>
          <Link
            href="/events"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            대회 공고
          </Link>
        </nav>

        <div className="flex shrink-0 items-center">
          <PublicManagerDownloadButton
            download={download}
            size="sm"
            className="h-9 rounded-lg border-transparent bg-matchon-primary px-3 text-xs font-bold text-white hover:bg-matchon-primary/90 hover:text-white sm:px-4"
            label="다운로드"
            showVersion={false}
          />
        </div>
      </div>
    </header>
  );
}
