import Link from "next/link";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventApplicationCta({
  eventStatus,
  registrationStatus,
  className,
  size = "lg",
}: {
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  className?: string;
  size?: "default" | "lg" | "sm";
}) {
  if (eventStatus === "finished") {
    return (
      <p
        className={cn(
          "rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        종료된 대회입니다.
      </p>
    );
  }

  if (registrationStatus === "open" && eventStatus === "open") {
    return (
      <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
        <Link
          href="/login"
          className={cn(buttonVariants({ size }), "shadow-sm")}
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
      <p
        className={cn(
          "rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm",
          className,
        )}
      >
        신청 기간 전입니다. 신청 일정을 확인해 주세요.
      </p>
    );
  }

  if (registrationStatus === "closed" || eventStatus === "closed") {
    return (
      <p
        className={cn(
          "rounded-lg border px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        신청이 마감되었습니다.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Link href="/login" className={cn(buttonVariants({ variant: "outline", size }))}>
        로그인 후 신청 안내
      </Link>
      <p className="text-muted-foreground text-xs">
        참가 신청은 소속 체육관 계정에서 진행합니다.
      </p>
    </div>
  );
}
