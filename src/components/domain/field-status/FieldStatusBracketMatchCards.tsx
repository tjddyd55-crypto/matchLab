"use client";

import Link from "next/link";
import { OrganizerBracketViewMatchCard } from "@/components/domain/brackets/OrganizerBracketViewMatchCard";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

function shouldShowWeighInOutcomeHint(row: FieldStatusRowDTO): boolean {
  return (
    row.weighInStatus === "fail" ||
    row.weighInStatus === "manual_fail" ||
    row.checkInStatus === "no_show" ||
    row.checkInStatus === "withdrawn" ||
    row.checkInStatus === "disqualified"
  );
}

export function FieldStatusBracketMatchCards({
  row,
  eventId,
}: {
  row: FieldStatusRowDTO;
  eventId: string;
}) {
  const assignments = row.bracketAssignments;

  if (assignments.length === 0) {
    return (
      <p className="text-matchon-text-secondary text-xs">
        아직 배정된 대진이 없습니다.
      </p>
    );
  }

  const showOutcomeHint = shouldShowWeighInOutcomeHint(row);

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => (
        <OrganizerBracketViewMatchCard
          key={assignment.matchId}
          matchOrderLabel={assignment.matchLabel}
          divisionLabel={assignment.divisionLabel}
          status={assignment.status}
          winnerId={assignment.winnerId}
          fighterRedId={assignment.fighterRedId}
          fighterRedName={assignment.fighterRedName}
          fighterRedGym={assignment.fighterRedGym}
          fighterRedHandicap={assignment.fighterRedHandicap}
          fighterBlueId={assignment.fighterBlueId}
          fighterBlueName={assignment.fighterBlueName}
          fighterBlueGym={assignment.fighterBlueGym}
          fighterBlueHandicap={assignment.fighterBlueHandicap}
          highlightFighterId={row.fighterId}
          opsLabel={
            !assignment.hasOfficialResult && showOutcomeHint
              ? "⚠ 계체 실패 후 패 처리 가능"
              : null
          }
          controls={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {assignment.hasOfficialResult ? (
                <p className="mr-auto text-xs text-[#64748B]">
                  공식 결과 확정
                </p>
              ) : null}
              <Link
                href={`/organizer/events/${eventId}/operation`}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] hover:border-[#0A47FF]/30 hover:bg-[#EAF1FF]/40"
              >
                경기 운영에서 보기
              </Link>
            </div>
          }
        />
      ))}
    </div>
  );
}
