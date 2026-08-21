"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrganizerMatchEditCard } from "@/components/domain/brackets/OrganizerMatchEditCard";
import { BracketMatchColumnHeader } from "@/components/domain/brackets/BracketMatchCompactRow";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { addEmptyBracketMatchAction } from "@/features/brackets/actions";
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
  const router = useRouter();
  const { alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();

  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );

  const sortedMatches = useMemo(
    () => sortMatchesByOrder(matches),
    [matches],
  );

  const defaultCourtId = activeCourts[0]?.id;

  function handleAddEmptyMatch() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      if (defaultCourtId) fd.set("defaultCourtId", defaultCourtId);
      const res = await addEmptyBracketMatchAction(fd);
      if (!res.ok) {
        await alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-lg">경기 목록 편집</CardTitle>
            <CardDescription>
              선수·경기장·라운드·시간 변경은 즉시 저장됩니다. 경기 순서는 대진표
              보기에서 조정하세요.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || activeCourts.length === 0}
            onClick={handleAddEmptyMatch}
          >
            {pending ? "추가 중…" : "빈 경기 추가"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCourts.length === 0 ? (
          <FeedbackMessage tone="error" role="alert">
            활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
          </FeedbackMessage>
        ) : null}

        {sortedMatches.length === 0 ? (
          <BracketsEmptyState message="등록된 경기가 없습니다. 빈 경기 추가로 경기를 만들거나, 대진표 생성 탭에서 자동 구성하세요." />
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
