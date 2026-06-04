import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventDetailNavMobile({
  slug,
  showLive,
}: {
  slug: string;
  showLive: boolean;
}) {
  const linkClass = cn(buttonVariants({ variant: "outline" }), "w-full justify-center");

  return (
    <nav
      className="flex flex-col gap-2 md:hidden"
      aria-label="대회 하위 페이지"
    >
      <Link href={`/events/${slug}/brackets`} className={linkClass}>
        대진표 보기
      </Link>
      <Link href={`/events/${slug}/results`} className={linkClass}>
        결과 보기
      </Link>
      {showLive ? (
        <Link href={`/events/${slug}/live`} className={linkClass}>
          라이브 보기
        </Link>
      ) : null}
    </nav>
  );
}
