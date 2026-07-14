"use client";

import { useMemo } from "react";
import { OrganizerMatchEditCard } from "@/components/domain/brackets/OrganizerMatchEditCard";
import { BracketMatchColumnHeader } from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BracketType } from "@/lib/enums";
import { sortMatchesByOrder } from "@/lib/match-order-display";

export function MatchListEditor({
  eventId,
  courts,
  bracketId,
  bracketType,
  bracketIsPublic,
  matches,
  options,
}: {
  eventId: string;
  courts: EventCourtVM[];
  bracketId: string;
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
}) {
  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );

  const sortedMatches = useMemo(
    () => sortMatchesByOrder(matches),
    [matches],
  );

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-lg">경기 목록 편집</CardTitle>
        <CardDescription>
          선수·경기장·라운드·시간 변경은 즉시 저장됩니다. 경기 순서는 대진표
          보기에서 조정하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCourts.length === 0 ? (
          <FeedbackMessage tone="error" role="alert">
            활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
          </FeedbackMessage>
        ) : null}

        {sortedMatches.length === 0 ? (
          <BracketsEmptyState message="등록된 경기가 없습니다. 대진표 생성 탭에서 경기를 구성하세요." />
        ) : (
          <div className="flex flex-col gap-3">
            <BracketMatchColumnHeader />
            {sortedMatches.map((m) => (
              <OrganizerMatchEditCard
                key={m.id}
                eventId={eventId}
                bracketId={bracketId}
                courts={courts}
                match={m}
                matches={sortedMatches}
                options={options}
                bracketType={bracketType}
                bracketIsPublic={bracketIsPublic}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
