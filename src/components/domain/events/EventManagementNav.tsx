import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventManagementNav({
  eventId,
  publicSlug,
}: {
  eventId: string;
  publicSlug: string;
}) {
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "justify-center",
  );

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-4"
      aria-label="대회 관리 바로가기"
    >
      <Link
        href={`/events/${publicSlug}`}
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        공개 공고
      </Link>
      <Link href={`/organizer/events/${eventId}/applications`} className={linkClass}>
        신청자 관리
      </Link>
      <Link href={`/organizer/events/${eventId}/brackets`} className={linkClass}>
        대진표
      </Link>
      <Link href={`/organizer/events/${eventId}/matches`} className={linkClass}>
        경기 운영
      </Link>
      <Link href={`/organizer/events/${eventId}/results`} className={linkClass}>
        결과 관리
      </Link>
      <Link href={`/organizer/events/${eventId}/live`} className={linkClass}>
        라이브 URL
      </Link>
    </nav>
  );
}
