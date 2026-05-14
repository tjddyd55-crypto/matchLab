import Link from "next/link";
import {
  publishBracketFormAction,
  unpublishBracketFormAction,
} from "@/features/brackets/actions";
import { BracketStatusBadge } from "@/components/domain/brackets/BracketStatusBadge";
import { BracketTypeBadge } from "@/components/domain/brackets/BracketTypeBadge";
import { MatchListEditor } from "@/components/domain/brackets/MatchListEditor";
import { TournamentBracketEditor } from "@/components/domain/brackets/TournamentBracketEditor";
import { Button, buttonVariants } from "@/components/ui/button";
import { BracketType } from "@/lib/enums";
import type { OrganizerBracketDetailVM } from "@/lib/services/bracket.service";
import { cn } from "@/lib/utils";

export function OrganizerBracketEditor({
  eventId,
  detail,
}: {
  eventId: string;
  detail: OrganizerBracketDetailVM;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/organizer/events/${eventId}/brackets`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 목록
          </Link>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {detail.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <BracketTypeBadge type={detail.type} />
            <BracketStatusBadge status={detail.status} />
            <span className="text-muted-foreground">
              공개 {detail.isPublic ? "예" : "아니오"}
            </span>
            {detail.divisionLabel ? (
              <span className="text-muted-foreground">
                부문 {detail.divisionLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!detail.isPublic ? (
            <form action={publishBracketFormAction}>
              <input type="hidden" name="bracketId" value={detail.id} />
              <Button type="submit">공개하기</Button>
            </form>
          ) : (
            <form action={unpublishBracketFormAction}>
              <input type="hidden" name="bracketId" value={detail.id} />
              <Button type="submit" variant="secondary">
                비공개
              </Button>
            </form>
          )}
        </div>
      </div>

      <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">승인된 신청 선수</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          pending·거절·취소 상태의 신청자는 서버에서 배치 대상에서 제외됩니다.
        </p>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {detail.approvedFighterOptions.map((o) => (
            <li
              key={o.applicationId}
              className="bg-muted/25 rounded-md border px-3 py-2"
            >
              <span className="font-medium">{o.label}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {o.divisionLabel}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {detail.type === BracketType.match_list ? (
        <MatchListEditor
          key={detail.syncKey}
          bracketId={detail.id}
          bracketType={detail.type}
          matches={detail.matches}
          options={detail.approvedFighterOptions}
        />
      ) : (
        <TournamentBracketEditor detail={detail} />
      )}
    </div>
  );
}
