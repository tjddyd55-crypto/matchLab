"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MatchListEditor } from "@/components/domain/brackets/MatchListEditor";
import { BracketApprovedCandidatesSection } from "@/components/domain/brackets/BracketApprovedCandidatesSection";
import { OrganizerBracketPrintActions } from "@/components/domain/brackets/OrganizerBracketPrintActions";
import { OrganizerUnmatchedPrintActions } from "@/components/domain/brackets/OrganizerUnmatchedPrintActions";
import { EventDivisionPickDialog } from "@/components/domain/brackets/EventDivisionPickDialog";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import {
  addEmptyBracketMatchAction,
  ensureBracketForDivisionAction,
} from "@/features/brackets/actions";
import type {
  OrganizerEventAllMatchesWorkspaceVM,
  OrganizerApprovedFighterOptionVM,
} from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { BracketType } from "@/lib/enums";

type ManualTarget = {
  bracketId: string;
  targetDivisionId: string;
  targetDivisionLabel: string;
  targetDivisionGender: string | null;
};

export function OrganizerAllMatchesWorkspaceClient({
  eventId,
  data,
  courts,
}: {
  eventId: string;
  data: OrganizerEventAllMatchesWorkspaceVM;
  courts: EventCourtVM[];
}) {
  const router = useRouter();
  const { alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualSuggestedDivisionId, setManualSuggestedDivisionId] = useState<
    string | null
  >(null);
  const [manualResolve, setManualResolve] = useState<{
    resolve: (v: ManualTarget | null) => void;
  } | null>(null);

  const defaultBracketId = useMemo(() => {
    const withBracket = data.divisions.find((d) => d.bracketId);
    return withBracket?.bracketId ?? data.matches[0]?.bracketId ?? "";
  }, [data.divisions, data.matches]);

  const defaultDivision = useMemo(
    () => data.divisions.find((d) => d.bracketId === defaultBracketId) ?? data.divisions[0] ?? null,
    [data.divisions, defaultBracketId],
  );

  const ensureBracketId = useCallback(
    async (divisionId: string): Promise<string | null> => {
      const existing = data.divisions.find((d) => d.id === divisionId)?.bracketId;
      if (existing) return existing;
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("divisionId", divisionId);
      const res = await ensureBracketForDivisionAction(fd);
      if (!res.ok) {
        await alert(res.error.message);
        return null;
      }
      return res.data.bracketId;
    },
    [alert, data.divisions, eventId],
  );

  function handleRequestAddEmpty() {
    setEmptyDialogOpen(true);
  }

  function handleConfirmEmpty(input: {
    divisionId: string;
    defaultCourtId?: string;
  }) {
    startTransition(async () => {
      const bracketId = await ensureBracketId(input.divisionId);
      if (!bracketId) return;
      const fd = new FormData();
      fd.set("bracketId", bracketId);
      if (input.defaultCourtId) fd.set("defaultCourtId", input.defaultCourtId);
      const res = await addEmptyBracketMatchAction(fd);
      if (!res.ok) {
        await alert(res.error.message);
        return;
      }
      setEmptyDialogOpen(false);
      router.refresh();
    });
  }

  const resolveManualTarget = useCallback(
    async (
      red: OrganizerApprovedFighterOptionVM,
      blue: OrganizerApprovedFighterOptionVM,
    ): Promise<ManualTarget | null> => {
      const sameDivision =
        red.divisionId &&
        blue.divisionId &&
        red.divisionId === blue.divisionId
          ? red.divisionId
          : null;

      if (sameDivision) {
        const div = data.divisions.find((d) => d.id === sameDivision);
        const bracketId = await ensureBracketId(sameDivision);
        if (!bracketId || !div) return null;
        return {
          bracketId,
          targetDivisionId: sameDivision,
          targetDivisionLabel: div.label,
          targetDivisionGender: div.gender,
        };
      }

      return new Promise((resolve) => {
        setManualSuggestedDivisionId(
          red.divisionId ?? blue.divisionId ?? data.divisions[0]?.id ?? null,
        );
        setManualResolve({ resolve });
        setManualDialogOpen(true);
      });
    },
    [data.divisions, ensureBracketId],
  );

  function handleConfirmManualDivision(input: {
    divisionId: string;
    defaultCourtId?: string;
  }) {
    startTransition(async () => {
      const div = data.divisions.find((d) => d.id === input.divisionId);
      const bracketId = await ensureBracketId(input.divisionId);
      if (!bracketId || !div) {
        manualResolve?.resolve(null);
        setManualResolve(null);
        setManualDialogOpen(false);
        return;
      }
      manualResolve?.resolve({
        bracketId,
        targetDivisionId: div.id,
        targetDivisionLabel: div.label,
        targetDivisionGender: div.gender,
      });
      setManualResolve(null);
      setManualDialogOpen(false);
    });
  }

  if (data.divisions.length === 0) {
    return (
      <BracketsEmptyState message="경기구분이 없습니다. 체급표를 먼저 구성해 주세요." />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">전체 경기 편집</h2>
        <div className="flex flex-wrap items-center gap-2">
          {data.matches.length > 0 ? (
            <OrganizerBracketPrintActions
              eventId={eventId}
              variant="view"
              printMode="all-matches"
            />
          ) : null}
          <OrganizerUnmatchedPrintActions
            eventId={eventId}
            variant="view"
            disabled={data.eventWideUnmatchedOptions.length === 0}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-5">
        <div className="flex min-h-0 min-w-0 flex-col">
          <MatchListEditor
            key={data.syncKey}
            eventId={eventId}
            courts={courts}
            bracketId={defaultBracketId || "pending"}
            bracketType={BracketType.match_list}
            bracketIsPublic={false}
            matches={data.matches}
            options={data.approvedFighterOptions}
            compactWorkspace
            orderMode="courtSchedule"
            eventWide
            onRequestAddEmptyMatch={handleRequestAddEmpty}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <BracketApprovedCandidatesSection
            options={data.approvedFighterOptions}
            eventWideUnmatchedOptions={data.eventWideUnmatchedOptions}
            matches={data.matches}
            bracketId={defaultBracketId || "pending"}
            bracketType={BracketType.match_list}
            defaultCourtId={courts.find((c) => c.isActive)?.id}
            targetDivisionId={defaultDivision?.id ?? null}
            targetDivisionLabel={defaultDivision?.label ?? null}
            targetDivisionGender={defaultDivision?.gender ?? null}
            variant="workspace"
            initialUnmatchedTab="event"
            resolveManualMatchTarget={resolveManualTarget}
          />
        </div>
      </div>

      <EventDivisionPickDialog
        open={emptyDialogOpen}
        onOpenChange={setEmptyDialogOpen}
        title="빈 경기 추가"
        description="빈 경기를 추가할 경기구분을 선택하세요."
        divisions={data.divisions}
        courts={courts}
        onConfirm={handleConfirmEmpty}
        pending={pending}
      />

      <EventDivisionPickDialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          setManualDialogOpen(open);
          if (!open) {
            manualResolve?.resolve(null);
            setManualResolve(null);
          }
        }}
        title="수동 경기 — 경기구분 선택"
        description="두 선수가 들어갈 대상 경기구분을 선택하세요."
        divisions={data.divisions}
        courts={courts}
        suggestedDivisionId={manualSuggestedDivisionId}
        onConfirm={handleConfirmManualDivision}
        pending={pending}
      />
    </section>
  );
}
