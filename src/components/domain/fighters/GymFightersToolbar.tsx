import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymFightersToolbar({
  showRequests,
  pendingRequestCount = 0,
}: {
  showRequests: boolean;
  pendingRequestCount?: number;
}) {
  const tabBase = "/gym/fighters";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/gym/fighters/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          선수 직접 등록
        </Link>
        <Link
          href="/gym/invite-links"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          등록 요청 링크 만들기
        </Link>
        <Link
          href={`${tabBase}?tab=requests`}
          className={cn(
            buttonVariants({
              variant: showRequests ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          등록 요청 목록
          {pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ""}
        </Link>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="선수 관리 탭">
        <Link
          href={tabBase}
          className={cn(
            buttonVariants({
              variant: !showRequests ? "default" : "outline",
              size: "sm",
            }),
            "rounded-full",
          )}
          aria-current={!showRequests ? "page" : undefined}
        >
          등록된 선수
        </Link>
        <Link
          href={`${tabBase}?tab=requests`}
          className={cn(
            buttonVariants({
              variant: showRequests ? "default" : "outline",
              size: "sm",
            }),
            "rounded-full",
          )}
          aria-current={showRequests ? "page" : undefined}
        >
          등록 요청
        </Link>
      </nav>
    </div>
  );
}
