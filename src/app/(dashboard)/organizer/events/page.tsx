import Link from "next/link";
import { OrganizerEventList } from "@/components/domain/events/OrganizerEventList";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { eventService } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const actor = await requireActor();
  const rows = await eventService.listOrganizerEvents(actor);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            내 대회
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            작성 중(draft) 대회는 공개 목록에 표시되지 않습니다. 신청 공개 전
            부문·입금 계좌를 준비해 주세요.
          </p>
        </div>
        <Link href="/organizer/events/new" className={cn(buttonVariants({ size: "lg" }))}>
          대회 만들기
        </Link>
      </header>

      <OrganizerEventList
        rows={rows}
        showOrganizerColumn={actor.role === "admin"}
      />
    </div>
  );
}
