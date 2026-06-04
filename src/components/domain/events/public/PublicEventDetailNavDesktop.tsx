import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventDetailNavDesktop({
  slug,
  showLive,
}: {
  slug: string;
  showLive: boolean;
}) {
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "justify-center",
  );

  return (
    <nav
      className="hidden flex-wrap gap-2 rounded-xl border bg-muted/20 p-4 md:flex"
      aria-label="대회 하위 페이지"
    >
      <Link href={`/events/${slug}/brackets`} className={linkClass}>
        대진표
      </Link>
      <Link href={`/events/${slug}/results`} className={linkClass}>
        결과
      </Link>
      {showLive ? (
        <Link href={`/events/${slug}/live`} className={linkClass}>
          라이브
        </Link>
      ) : null}
    </nav>
  );
}
