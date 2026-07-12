import Link from "next/link";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EventApplicationCta({
  eventStatus,
  registrationStatus,
  className,
  size = "field",
}: {
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  className?: string;
  size?: "default" | "lg" | "sm" | "field";
}) {
  const buttonSize = size === "lg" ? "field" : size;

  if (eventStatus === "finished") {
    return (
      <FeedbackMessage tone="info" className={className}>
        종료된 대회입니다.
      </FeedbackMessage>
    );
  }

  if (registrationStatus === "open" && eventStatus === "open") {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: buttonSize }), "w-full shadow-sm sm:w-auto")}
        >
          대회 신청하기
        </Link>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          체육관 계정으로 로그인한 뒤 소속 선수를 신청할 수 있습니다.
        </p>
      </div>
    );
  }

  if (registrationStatus === "before") {
    return (
      <FeedbackMessage tone="info" className={className}>
        신청 기간 전입니다. 신청 일정을 확인해 주세요.
      </FeedbackMessage>
    );
  }

  if (registrationStatus === "closed" || eventStatus === "closed") {
    return (
      <FeedbackMessage tone="warning" className={className}>
        신청이 마감되었습니다.
      </FeedbackMessage>
    );
  }

  return (
    <Card variant="muted" className={cn("py-4", className)}>
      <CardContent className="space-y-3 px-4">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: buttonSize }), "w-full sm:w-auto")}
        >
          로그인 후 신청 안내
        </Link>
        <p className="text-muted-foreground text-xs">
          참가 신청은 소속 체육관 계정에서 진행합니다.
        </p>
      </CardContent>
    </Card>
  );
}
