"use client";

import { useState } from "react";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OrganizerMatchEditSlot } from "@/components/domain/brackets/OrganizerMatchEditSlot";
import { BracketMatchOrderControls } from "@/components/domain/brackets/BracketMatchOrderControls";
import { Button } from "@/components/ui/button";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { BracketType, type BracketMatchStatus } from "@/lib/enums";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { getMatchListDisabledFighterIds } from "@/lib/bracket-match-placement";

function statusLabel(s: BracketMatchStatus): string {
  switch (s) {
    case "waiting":
      return "대기";
    case "called":
      return "호출";
    case "ongoing":
      return "진행중";
    case "finished":
      return "종료";
    case "delayed":
      return "지연";
    case "cancelled":
      return "취소";
    default:
      return s;
  }
}

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

export function OrganizerMatchEditCard({
  row,
  rowIndex,
  rows,
  options,
  serverMatch,
  bracketType,
  divisionLabel,
  sortedServerMatches,
  onUpdateRow,
}: {
  row: MatchListEditorRow;
  rowIndex: number;
  rows: MatchListEditorRow[];
  options: OrganizerApprovedFighterOptionVM[];
  serverMatch: OrganizerBracketMatchVM | undefined;
  bracketType: BracketType;
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

  return (
    <article className="ring-foreground/10 overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{orderLabel}</span>
          {divisionLabel ? (
            <span className="text-muted-foreground text-xs">{divisionLabel}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {serverMatch ? (
            <span className="rounded-full bg-background px-2.5 py-0.5 font-medium">
              {statusLabel(serverMatch.status)}
            </span>
          ) : (
            <span className="text-muted-foreground rounded-full bg-background px-2.5 py-0.5">
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
          className="rounded-none border-0 border-b md:border-b-0 md:border-r"
        />

        <div className="bg-muted/40 flex flex-col items-center justify-center gap-3 border-b px-4 py-4 md:border-b-0 md:py-6">
          <span className="text-2xl font-black tracking-widest text-muted-foreground">
            VS
          </span>
          <div className="grid w-full min-w-[7rem] gap-2 text-xs">
            <label className="space-y-0.5">
              <span className="text-muted-foreground">경기번호</span>
              <input
                className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
                value={row.matchNumber}
                placeholder="—"
                onChange={(e) => patch({ matchNumber: e.target.value })}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">편집 순서</span>
              <input
                type="number"
                min={0}
                className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
                value={row.matchOrder}
                onChange={(e) =>
                  patch({ matchOrder: Number(e.target.value) })
                }
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">매트</span>
              <input
                className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
                value={row.matNumber}
                placeholder="—"
                onChange={(e) => patch({ matNumber: e.target.value })}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">전체 순서</span>
              <input
                className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
                value={row.globalMatchOrder}
                placeholder="—"
                onChange={(e) => patch({ globalMatchOrder: e.target.value })}
              />
            </label>
          </div>
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
          className="rounded-none border-0"
        />
      </div>

      <footer className="space-y-3 border-t bg-muted/15 px-4 py-3">
        {showOps && serverMatch ? (
          <BracketMatchOrderControls
            match={serverMatch}
            allMatches={sortedServerMatches}
          />
        ) : (
          <p className="text-muted-foreground text-xs">
            경기 목록 저장 후 순서 변경·경기 운영을 사용할 수 있습니다.
          </p>
        )}

        {showOps && serverMatch ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpsOpen((v) => !v)}
            >
              {opsOpen ? "경기 운영 닫기" : "경기 운영 열기"}
            </Button>
            {opsOpen ? (
              <div className="mt-3">
                <OrganizerMatchOpsPanel
                  {...matchListOpsProps(serverMatch, bracketType)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {serverMatch?.hasOfficialResults ? (
          <p className="text-amber-800 text-xs dark:text-amber-200">
            공식 결과가 확정된 경기는 순서·선수 변경이 제한됩니다.
          </p>
        ) : null}
      </footer>
    </article>
  );
}
