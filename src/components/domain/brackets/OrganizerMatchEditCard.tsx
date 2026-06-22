"use client";

import { useState, type ReactNode } from "react";
import { MatchBoutFormatToggle } from "@/components/domain/brackets/MatchBoutFormatToggle";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OrganizerMatchEditSlot } from "@/components/domain/brackets/OrganizerMatchEditSlot";
import { BracketMatchOrderControls } from "@/components/domain/brackets/BracketMatchOrderControls";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { Button } from "@/components/ui/button";
import { BracketMatchStatusBadge } from "@/components/domain/shared/BracketMatchStatusBadge";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { BracketType } from "@/lib/enums";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { cornerSlotInGridClass } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";
import { getMatchListDisabledFighterIds } from "@/lib/bracket-match-placement";

export type MatchListEditorRow = {
  key: string;
  fighterRedId: string;
  fighterBlueId: string;
  matchOrder: number;
  globalMatchOrder: string;
  matchNumber: string;
  matNumber: string;
};

function matchListOpsProps(
  m: OrganizerBracketMatchVM,
  bracketType: BracketType,
) {
  return {
    bracketType,
    matchId: m.id,
    status: m.status,
    fighterRedId: m.fighterRedId,
    fighterBlueId: m.fighterBlueId,
    fighterRedName: m.fighterRedSnapshot?.name ?? "미배정",
    fighterBlueName: m.fighterBlueSnapshot?.name ?? "미배정",
    hasOfficialResults: m.hasOfficialResults,
    winnerId: m.winnerId,
    resultType: m.resultType,
    resultMemo: m.resultMemo,
    compact: true as const,
  };
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-muted-foreground shrink-0 text-[10px]">{label}</span>
      {children}
    </label>
  );
}

export function OrganizerMatchEditCard({
  eventId,
  bracketId,
  courts,
  row,
  rowIndex,
  rows,
  options,
  serverMatch,
  bracketType,
  bracketIsPublic,
  divisionLabel,
  sortedServerMatches,
  onUpdateRow,
}: {
  eventId: string;
  bracketId: string;
  courts: EventCourtVM[];
  row: MatchListEditorRow;
  rowIndex: number;
  rows: MatchListEditorRow[];
  options: OrganizerApprovedFighterOptionVM[];
  serverMatch: OrganizerBracketMatchVM | undefined;
  bracketType: BracketType;
  bracketIsPublic?: boolean;
  divisionLabel?: string | null;
  sortedServerMatches: OrganizerBracketMatchVM[];
  onUpdateRow: (index: number, patch: Partial<MatchListEditorRow>) => void;
}) {
  const [opsOpen, setOpsOpen] = useState(false);
  const showOps = Boolean(serverMatch) && !String(row.key).includes("-");
  const editLocked = Boolean(serverMatch?.hasOfficialResults);

  const orderLabel = serverMatch
    ? formatMatchOrderFormal(serverMatch)
    : `제${rowIndex + 1}경기`;

  const patch = (p: Partial<MatchListEditorRow>) => onUpdateRow(rowIndex, p);

  const inputClass =
    "border-input bg-background h-6 w-14 rounded-md border px-1.5 text-[11px]";

  return (
    <article className="ring-foreground/10 overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={bracketCardTypography.matchNumber}>{orderLabel}</span>
          {divisionLabel ? (
            <span className={bracketCardTypography.division}>{divisionLabel}</span>
          ) : null}
          {serverMatch?.courtName ? (
            <span
              className={cn(
                bracketCardTypography.opsPill,
                "bg-background font-medium",
              )}
            >
              {serverMatch.courtName}
              {serverMatch.courtOrder != null
                ? ` · ${serverMatch.courtOrder}경기`
                : ""}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {serverMatch ? (
            <BracketMatchStatusBadge status={serverMatch.status} />
          ) : (
            <span className="text-muted-foreground rounded-full bg-background px-2 py-0.5">
              미저장
            </span>
          )}
          {serverMatch?.hasOfficialResults ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              결과 확정
            </span>
          ) : serverMatch ? (
            <span className="text-muted-foreground">결과 미확정</span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <OrganizerMatchEditSlot
          cornerLabel="홍코너"
          fighterId={row.fighterRedId}
          snapshot={serverMatch?.fighterRedSnapshot}
          options={options}
          disabledOptionIds={getMatchListDisabledFighterIds(rows, rowIndex, "red")}
          onChange={(v) => patch({ fighterRedId: v })}
          editDisabled={editLocked}
          className={cornerSlotInGridClass("홍코너", "border-b md:border-b-0")}
        />

        <div className="bg-muted/30 text-muted-foreground flex flex-col items-center justify-center border-b px-3 py-2 md:border-b-0 md:py-0">
          <span className="text-lg font-black tracking-widest">VS</span>
          {showOps && serverMatch ? (
            <MatchBoutFormatToggle
              matchId={serverMatch.id}
              bracketType={bracketType}
              bracketIsPublic={bracketIsPublic}
              resultMemo={serverMatch.resultMemo}
              disabled={editLocked}
            />
          ) : null}
        </div>

        <OrganizerMatchEditSlot
          cornerLabel="청코너"
          fighterId={row.fighterBlueId}
          snapshot={serverMatch?.fighterBlueSnapshot}
          options={options}
          disabledOptionIds={getMatchListDisabledFighterIds(
            rows,
            rowIndex,
            "blue",
          )}
          onChange={(v) => patch({ fighterBlueId: v })}
          editDisabled={editLocked}
          className={cornerSlotInGridClass("청코너")}
        />
      </div>

      <footer className="space-y-2 border-t bg-muted/10 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <CompactField label="경기번호">
            <input
              className={inputClass}
              value={row.matchNumber}
              placeholder="—"
              onChange={(e) => patch({ matchNumber: e.target.value })}
            />
          </CompactField>
          <CompactField label="매트">
            <input
              className={inputClass}
              value={row.matNumber}
              placeholder="—"
              onChange={(e) => patch({ matNumber: e.target.value })}
            />
          </CompactField>
          <CompactField label="편집순서">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={row.matchOrder}
              onChange={(e) =>
                patch({ matchOrder: Number(e.target.value) })
              }
            />
          </CompactField>
          <CompactField label="전체순서">
            <input
              className={inputClass}
              value={row.globalMatchOrder}
              placeholder="—"
              onChange={(e) => patch({ globalMatchOrder: e.target.value })}
            />
          </CompactField>

          {showOps && serverMatch ? (
            <BracketMatchOrderControls
              inline
              match={serverMatch}
              allMatches={sortedServerMatches}
            />
          ) : null}

          {showOps && serverMatch ? (
            <MatchCourtControls
              key={`${serverMatch.id}:${serverMatch.courtId ?? ""}:${serverMatch.courtOrder ?? ""}`}
              inline
              eventId={eventId}
              bracketId={bracketId}
              matchId={serverMatch.id}
              courts={courts}
              courtId={serverMatch.courtId}
              courtOrder={serverMatch.courtOrder}
              hasOfficialResults={serverMatch.hasOfficialResults}
            />
          ) : null}

          {showOps && serverMatch ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => setOpsOpen((v) => !v)}
            >
              {opsOpen ? "경기 운영 닫기" : "경기 운영 열기"}
            </Button>
          ) : null}
        </div>

        {!showOps ? (
          <p className="text-muted-foreground text-[11px]">
            경기 목록 저장 후 순서 변경·경기 운영을 사용할 수 있습니다.
          </p>
        ) : null}

        {opsOpen && serverMatch ? (
          <div className="pt-1">
            <OrganizerMatchOpsPanel
              {...matchListOpsProps(serverMatch, bracketType)}
            />
          </div>
        ) : null}

        {serverMatch?.hasOfficialResults ? (
          <p className="text-amber-800 text-[11px] dark:text-amber-200">
            공식 결과가 확정된 경기는 순서·선수 변경이 제한됩니다.
          </p>
        ) : null}
      </footer>
    </article>
  );
}
