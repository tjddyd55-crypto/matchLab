import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GymDashboardEventCardVM = {
  id: string;
  title: string;
  publicSlug: string;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: string;
  liveStreamingEnabled: boolean;
  streamingConsentRequired: boolean;
  organizerName: string;
  divisionCount: number;
};

export function GymEventCard({ event }: { event: GymDashboardEventCardVM }) {
  const regStart = new Date(event.registrationStartDate).toLocaleDateString(
    "ko-KR",
  );
  const regEnd = new Date(event.registrationEndDate).toLocaleDateString("ko-KR");
  const eventDay = new Date(event.eventDate).toLocaleDateString("ko-KR");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">{event.title}</CardTitle>
        <CardDescription>
          주최 {event.organizerName} · 부문 {event.divisionCount}개
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>대회일</dt>
            <dd className="text-foreground">{eventDay}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>신청 기간</dt>
            <dd className="text-right text-foreground">
              {regStart} ~ {regEnd}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>상태</dt>
            <dd className="text-foreground">{event.status}</dd>
          </div>
          {(event.liveStreamingEnabled || event.streamingConsentRequired) ? (
            <div className="rounded-md bg-amber-950/15 px-2 py-1 text-amber-950 dark:text-amber-100">
              촬영·스트리밍 안내 및 동의가 필요할 수 있습니다.
            </div>
          ) : null}
        </dl>
        <Link
          href={`/gym/events/${event.id}/apply`}
          className={cn(buttonVariants({ variant: "default" }), "inline-flex w-full justify-center")}
        >
          신청하기
        </Link>
      </CardContent>
    </Card>
  );
}
