"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createMatchListMatchesAction } from "@/features/brackets/actions";
import {
  OrganizerMatchEditCard,
  type MatchListEditorRow,
} from "@/components/domain/brackets/OrganizerMatchEditCard";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { Button } from "@/components/ui/button";
import { BracketType } from "@/lib/enums";
import { sortMatchesByOrder } from "@/lib/match-order-display";

function vmToRows(matches: OrganizerBracketMatchVM[]): MatchListEditorRow[] {
  if (matches.length === 0) {
    return [
      {
        key: crypto.randomUUID(),
        fighterRedId: "",
        fighterBlueId: "",
        matchOrder: 0,
        globalMatchOrder: "",
        matchNumber: "",
        matNumber: "",
      },
    ];
  }
  return matches.map((m) => ({
    key: m.id,
    fighterRedId: m.fighterRedId ?? "",
    fighterBlueId: m.fighterBlueId ?? "",
    matchOrder: m.matchOrder,
    globalMatchOrder:
      m.globalMatchOrder === null ? "" : String(m.globalMatchOrder),
    matchNumber: m.matchNumber === null ? "" : String(m.matchNumber),
    matNumber: m.matNumber === null ? "" : String(m.matNumber),
  }));
}

export function MatchListEditor({
  eventId,
  courts,
  bracketId,
  bracketType,
  matches,
  options,
  divisionLabel,
}: {
  eventId: string;
  courts: EventCourtVM[];
  bracketId: string;
  bracketType: BracketType;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
  divisionLabel?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<MatchListEditorRow[]>(() => vmToRows(matches));

  const [state, formAction, pending] = useActionState(
    createMatchListMatchesAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  const sortedServerMatches = useMemo(
    () => sortMatchesByOrder(matches),
    [matches],
  );

  const payloadJson = useMemo(() => {
    const normalized = rows
      .map((r) => {
        const red = r.fighterRedId.trim();
        const blue = r.fighterBlueId.trim();
        if (!red && !blue) return null;
        const globalRaw = r.globalMatchOrder.trim();
        const matchNumRaw = r.matchNumber.trim();
        const matRaw = r.matNumber.trim();
        const globalN = globalRaw === "" ? undefined : Number(globalRaw);
        const matchN = matchNumRaw === "" ? undefined : Number(matchNumRaw);
        const matN = matRaw === "" ? undefined : Number(matRaw);
        return {
          fighterRedId: red || undefined,
          fighterBlueId: blue || undefined,
          matchOrder: r.matchOrder,
          globalMatchOrder:
            globalN !== undefined && Number.isFinite(globalN)
              ? globalN
              : undefined,
          matchNumber:
            matchN !== undefined && Number.isFinite(matchN) ? matchN : undefined,
          matNumber:
            matN !== undefined && Number.isFinite(matN) ? matN : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    return JSON.stringify(normalized);
  }, [rows]);

  function updateRow(index: number, patch: Partial<MatchListEditorRow>) {
    setRows((prev) =>
      prev.map((x, i) => (i === index ? { ...x, ...patch } : x)),
    );
  }

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">경기 목록 편집</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            홍코너와 청코너를 한눈에 확인하고 배치·순서를 조정합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              {
                key: crypto.randomUUID(),
                fighterRedId: "",
                fighterBlueId: "",
                matchOrder: prev.length,
                globalMatchOrder: "",
                matchNumber: "",
                matNumber: "",
              },
            ])
          }
        >
          경기 추가
        </Button>
      </div>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-emerald-700 text-sm dark:text-emerald-400">
          저장되었습니다.
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="bracketId" value={bracketId} />
        <input type="hidden" name="matchesPayload" value={payloadJson} />

        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => {
            const serverMatch = matches.find((m) => m.id === r.key);
            return (
              <OrganizerMatchEditCard
                key={r.key}
                eventId={eventId}
                bracketId={bracketId}
                courts={courts}
                row={r}
                rowIndex={idx}
                rows={rows}
                options={options}
                serverMatch={serverMatch}
                bracketType={bracketType}
                divisionLabel={divisionLabel}
                sortedServerMatches={sortedServerMatches}
                onUpdateRow={updateRow}
              />
            );
          })}
        </div>

        <p className="text-muted-foreground text-xs">
          저장 시 기존 경기 행은 초기화 후 다시 생성됩니다. React Query 도입 시{" "}
          <code className="text-foreground">queryKeys.matches.byBracket</code>{" "}
          무효화를 권장합니다.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "경기 목록 저장"}
        </Button>
      </form>
    </div>
  );
}
