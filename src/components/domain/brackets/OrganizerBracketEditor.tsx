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
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BracketType } from "@/lib/enums";
import type { OrganizerBracketDetailVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { cn } from "@/lib/utils";

export function OrganizerBracketEditor({
  eventId,
  detail,
  courts,
}: {
  eventId: string;
  detail: OrganizerBracketDetailVM;
  courts: EventCourtVM[];
}) {
  return (
    <div className="flex w-full flex-col gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <Link
                href={`/organizer/events/${eventId}/brackets`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "-ml-2",
                )}
              >
                ← 대진표 그룹
              </Link>
              {detail.division ? (
                <DivisionCompactDisplay
                  division={detail.division}
                  mainClassName="font-heading text-2xl font-semibold tracking-tight"
                />
              ) : (
                <CardTitle className="font-heading text-2xl">
                  {detail.displayTitle}
                </CardTitle>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <BracketTypeBadge type={detail.type} />
                <BracketStatusBadge status={detail.status} />
                <MatchonStatusBadge
                  status={detail.isPublic ? "public" : "private"}
                  label={detail.isPublic ? "공개" : "비공개"}
                  size="sm"
                />
              </div>
              <CardDescription>
                선수 배정·경기장·순서·상태 변경은 아래 편집 영역에서 진행합니다.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {!detail.isPublic ? (
                <form action={publishBracketFormAction}>
                  <input type="hidden" name="bracketId" value={detail.id} />
                  <Button type="submit" size="default" className="w-full sm:w-auto">
                    공개하기
                  </Button>
                </form>
              ) : (
                <form action={unpublishBracketFormAction}>
                  <input type="hidden" name="bracketId" value={detail.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="default"
                    className="w-full sm:w-auto"
                  >
                    비공개
                  </Button>
                </form>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <BracketApprovedCandidatesSection
        options={detail.approvedFighterOptions}
        matches={detail.matches}
      />

      {detail.type === BracketType.match_list ? (
        <MatchListEditor
          key={detail.syncKey}
          eventId={eventId}
          courts={courts}
          bracketId={detail.id}
          bracketType={detail.type}
          bracketIsPublic={detail.isPublic}
          matches={detail.matches}
          options={detail.approvedFighterOptions}
        />
      ) : (
        <TournamentBracketEditor eventId={eventId} courts={courts} detail={detail} />
      )}
    </div>
  );
}
