import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  matchonCardStackClass,
  matchonPageDescClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export type GymEventSubpageActive = "apply" | "status" | "field-status";

export function GymEventSubpageHeader({
  eventId,
  eventTitle,
  pageTitle,
  publicSlug,
  active,
  meta,
}: {
  eventId: string;
  eventTitle: string;
  pageTitle: string;
  publicSlug?: string;
  active: GymEventSubpageActive;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        href="/gym/events"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2 self-start",
        )}
      >
        ← 대회 목록
      </Link>

      <Card variant="muted" className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/15 pb-3">
          <CardTitle className={matchonSectionTitleClass}>{pageTitle}</CardTitle>
          <p className={cn(matchonPageDescClass, "mt-1 line-clamp-2 break-words")}>
            {eventTitle}
          </p>
          {meta ? <div className="mt-2">{meta}</div> : null}
        </CardHeader>
        <CardContent className={cn("pt-4", matchonCardStackClass)}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {active !== "apply" ? (
              <Link
                href={`/gym/events/${eventId}/apply`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "field" }),
                  "w-full sm:w-auto",
                )}
              >
                참가 신청
              </Link>
            ) : null}
            {active !== "status" ? (
              <Link
                href={`/gym/events/${eventId}/status`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "field" }),
                  "w-full sm:w-auto",
                )}
              >
                신청 현황
              </Link>
            ) : null}
            {active !== "field-status" ? (
              <Link
                href={`/gym/events/${eventId}/field-status`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "field" }),
                  "w-full sm:w-auto",
                )}
              >
                현장·계체 상태
              </Link>
            ) : null}
            {publicSlug ? (
              <Link
                href={`/events/${publicSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "field" }),
                  "w-full sm:w-auto",
                )}
              >
                공개 공고 보기
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
