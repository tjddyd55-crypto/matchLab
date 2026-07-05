"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEmptyBracketMatchAction } from "@/features/brackets/actions";
import { OrganizerMatchEditCard } from "@/components/domain/brackets/OrganizerMatchEditCard";
import { BracketMatchColumnHeader } from "@/components/domain/brackets/BracketMatchCompactRow";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { formatCourtTabLabel } from "@/lib/court-tab-label";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );
  const [defaultCourtId, setDefaultCourtId] = useState(
    () => activeCourts[0]?.id ?? "",
  );

  const sortedMatches = useMemo(
    () => sortMatchesByOrder(matches),
    [matches],
  );

  function addMatch() {
    if (!defaultCourtId) {
      setError("경기장을 선택해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      fd.set("defaultCourtId", defaultCourtId);
      const res = await addEmptyBracketMatchAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">경기 목록 편집</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            선수·경기장·라운드·시간 변경은 즉시 저장됩니다. 경기 순서는 대진표
            보기에서 조정하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">신규 경기장</span>
            <select
              className="border-input bg-background h-8 rounded-md border px-2 text-sm"
              value={defaultCourtId}
              onChange={(e) => setDefaultCourtId(e.target.value)}
              disabled={activeCourts.length === 0}
            >
              {activeCourts.map((c, idx) => (
                <option key={c.id} value={c.id}>
                  {formatCourtTabLabel(c, idx)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || activeCourts.length === 0 || !defaultCourtId}
            onClick={addMatch}
          >
            {pending ? "추가 중…" : "경기 추가"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {activeCourts.length === 0 ? (
        <p className="text-destructive text-sm">
          활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
        </p>
      ) : null}

      {sortedMatches.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          등록된 경기가 없습니다. 경기 추가 또는 자동매칭을 사용하세요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
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
    </div>
  );
}
