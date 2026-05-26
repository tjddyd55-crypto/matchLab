import Link from "next/link";
import {
  publishBracketFormAction,
  unpublishBracketFormAction,
} from "@/features/brackets/actions";
import { BracketApprovedCandidatesSection } from "@/components/domain/brackets/BracketApprovedCandidatesSection";
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

      <BracketApprovedCandidatesSection
        options={detail.approvedFighterOptions}
        matches={detail.matches}
      />

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
