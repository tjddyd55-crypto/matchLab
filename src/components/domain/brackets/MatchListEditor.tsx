"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createMatchListMatchesAction } from "@/features/brackets/actions";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
import { Button } from "@/components/ui/button";
import { BracketType } from "@/lib/enums";
import { cn } from "@/lib/utils";

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

type Row = {
  key: string;
  fighterRedId: string;
  fighterBlueId: string;
  matchOrder: number;
  globalMatchOrder: string;
  matchNumber: string;
  matNumber: string;
};

function vmToRows(matches: OrganizerBracketMatchVM[]): Row[] {
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
  bracketId,
  bracketType,
  matches,
  options,
}: {
  bracketId: string;
  bracketType: BracketType;
  matches: OrganizerBracketMatchVM[];
  options: OrganizerApprovedFighterOptionVM[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => vmToRows(matches));

  const [state, formAction, pending] = useActionState(
    createMatchListMatchesAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  const payloadJson = useMemo(() => {
    const normalized = rows
      .filter((r) => r.fighterRedId && r.fighterBlueId)
      .map((r) => ({
        fighterRedId: r.fighterRedId,
        fighterBlueId: r.fighterBlueId,
        matchOrder: r.matchOrder,
        globalMatchOrder: r.globalMatchOrder
          ? Number(r.globalMatchOrder)
          : undefined,
        matchNumber: r.matchNumber ? Number(r.matchNumber) : undefined,
        matNumber: r.matNumber ? Number(r.matNumber) : undefined,
      }));
    return JSON.stringify(normalized);
  }, [rows]);

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">경기 목록 편집</h2>
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
          경기 행 추가
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

        <div className="hidden lg:block overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase">
              <tr>
                <th className="px-3 py-2">순서</th>
                <th className="px-3 py-2">레드</th>
                <th className="px-3 py-2">블루</th>
                <th className="px-3 py-2">경기번호</th>
                <th className="px-3 py-2">매트</th>
                <th className="px-3 py-2">전체순서</th>
                <th className="px-3 py-2 w-[min(280px,40vw)]">현장 운영</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const serverMatch = matches.find((m) => m.id === r.key);
                const showOps =
                  Boolean(serverMatch) && !String(r.key).includes("-");
                return (
                <tr key={r.key} className="border-b last:border-0">
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      min={0}
                      className={cn(
                        "border-input bg-background h-9 w-20 rounded-md border px-2 text-sm",
                      )}
                      value={r.matchOrder}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, matchOrder: v } : x,
                          ),
                        );
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <ApprovedApplicationPicker
                      value={r.fighterRedId}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, fighterRedId: v } : x,
                          ),
                        )
                      }
                      options={options}
                      placeholder="레드 선수"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <ApprovedApplicationPicker
                      value={r.fighterBlueId}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, fighterBlueId: v } : x,
                          ),
                        )
                      }
                      options={options}
                      placeholder="블루 선수"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      className={cn(
                        "border-input bg-background h-9 w-20 rounded-md border px-2 text-sm",
                      )}
                      value={r.matchNumber}
                      placeholder="선택"
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, matchNumber: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      className={cn(
                        "border-input bg-background h-9 w-20 rounded-md border px-2 text-sm",
                      )}
                      value={r.matNumber}
                      placeholder="선택"
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, matNumber: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      className={cn(
                        "border-input bg-background h-9 w-24 rounded-md border px-2 text-sm",
                      )}
                      value={r.globalMatchOrder}
                      placeholder="선택"
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, globalMatchOrder: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    {showOps && serverMatch ? (
                      <OrganizerMatchOpsPanel
                        {...matchListOpsProps(serverMatch, bracketType)}
                      />
                    ) : (
                      <span className="text-muted-foreground text-[11px]">
                        저장 후 운영 패널이 열립니다.
                      </span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          {rows.map((r, idx) => {
            const serverMatch = matches.find((m) => m.id === r.key);
            const showOps =
              Boolean(serverMatch) && !String(r.key).includes("-");
            return (
            <div
              key={r.key}
              className="bg-muted/20 space-y-3 rounded-lg border p-3 text-sm"
            >
              <div className="font-medium">경기 {idx + 1}</div>
              <label className="block space-y-1">
                <span className="text-muted-foreground text-xs">순서</span>
                <input
                  type="number"
                  min={0}
                  className={cn(
                    "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
                  )}
                  value={r.matchOrder}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, matchOrder: v } : x,
                      ),
                    );
                  }}
                />
              </label>
              <ApprovedApplicationPicker
                value={r.fighterRedId}
                onChange={(v) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, fighterRedId: v } : x,
                    ),
                  )
                }
                options={options}
                placeholder="레드 선수"
                className="max-w-none"
              />
              <ApprovedApplicationPicker
                value={r.fighterBlueId}
                onChange={(v) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, fighterBlueId: v } : x,
                    ),
                  )
                }
                options={options}
                placeholder="블루 선수"
                className="max-w-none"
              />
              {showOps && serverMatch ? (
                <OrganizerMatchOpsPanel
                  {...matchListOpsProps(serverMatch, bracketType)}
                />
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  저장 후 현장 운영 패널을 사용할 수 있습니다.
                </p>
              )}
            </div>
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
