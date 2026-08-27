"use client";

import { useMemo, useState } from "react";
import {
  OrganizerMatchOpsPanel,
} from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { BracketMatchStatus } from "@/lib/enums";
import { ORGANIZER_FIELD_SELECT_CLASS, ORGANIZER_FILTER_BAR_CLASS } from "@/lib/organizer-dashboard-layout";
import { organizerBracketTableWrapClass } from "@/lib/ui/organizer-bracket-ui";
import { listTableHeaderRowClass } from "@/lib/ui/list-table-styles";
import { cn } from "@/lib/utils";

function rowOps(row: OrganizerEventMatchListItemVM) {
  return {
    bracketType: row.bracketType,
    matchId: row.matchId,
    status: row.status,
    fighterRedId: row.fighterRed?.id ?? null,
    fighterBlueId: row.fighterBlue?.id ?? null,
    fighterRedName: row.fighterRed?.name ?? "미배정",
    fighterBlueName: row.fighterBlue?.name ?? "미배정",
    hasOfficialResults: row.hasOfficialResults,
    winnerId: row.winnerId,
    resultType: row.resultType,
    resultMemo: row.resultMemo,
    compact: true as const,
  };
}

export function OrganizerMatchesBoard({
  matches,
}: {
  matches: OrganizerEventMatchListItemVM[];
}) {
  const [bracketId, setBracketId] = useState<string>("");
  const [divisionLabel, setDivisionLabel] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [mat, setMat] = useState<string>("");

  const bracketOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const m of matches) {
      set.set(m.bracketId, m.bracketTitle);
    }
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [matches]);

  const divisionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.divisionLabel?.trim()) set.add(m.divisionLabel);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (bracketId && m.bracketId !== bracketId) return false;
      if (divisionLabel && m.divisionLabel !== divisionLabel) return false;
      if (status && m.status !== status) return false;
      if (mat && String(m.matNumber ?? "") !== mat) return false;
      return true;
    });
  }, [matches, bracketId, divisionLabel, status, mat]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ga = a.globalMatchOrder ?? a.matchOrder;
      const gb = b.globalMatchOrder ?? b.matchOrder;
      if (ga !== gb) return ga - gb;
      return a.matchOrder - b.matchOrder;
    });
  }, [filtered]);

  const matOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.matNumber != null) set.add(String(m.matNumber));
    }
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className={ORGANIZER_FILTER_BAR_CLASS}>
        <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-matchon-text-secondary text-xs">대진표 그룹</span>
          <select
            value={bracketId}
            onChange={(e) => setBracketId(e.target.value)}
            className={cn(ORGANIZER_FIELD_SELECT_CLASS, "min-w-[180px]")}
          >
            <option value="">전체</option>
            {bracketOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-matchon-text-secondary text-xs">경기구분</span>
          <select
            value={divisionLabel}
            onChange={(e) => setDivisionLabel(e.target.value)}
            className={cn(ORGANIZER_FIELD_SELECT_CLASS, "min-w-[180px]")}
          >
            <option value="">전체</option>
            {divisionOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-matchon-text-secondary text-xs">경기 상태</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={cn(ORGANIZER_FIELD_SELECT_CLASS, "min-w-[160px]")}
          >
            <option value="">전체</option>
            {Object.values(BracketMatchStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-matchon-text-secondary text-xs">매트</span>
          <select
            value={mat}
            onChange={(e) => setMat(e.target.value)}
            className={cn(ORGANIZER_FIELD_SELECT_CLASS, "min-w-[120px]")}
          >
            <option value="">전체</option>
            {matOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        </div>
      </div>

      <div className={cn(organizerBracketTableWrapClass, "hidden xl:block desktop:block")}>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className={cn(listTableHeaderRowClass, "text-xs uppercase")}>
            <tr>
              <th className="px-3 py-2">대진표 그룹</th>
              <th className="px-3 py-2">경기구분</th>
              <th className="px-3 py-2">라운드</th>
              <th className="px-3 py-2">번호</th>
              <th className="px-3 py-2">매트</th>
              <th className="px-3 py-2">레드</th>
              <th className="px-3 py-2">블루</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">운영 종료</th>
              <th className="px-3 py-2">공식 결과</th>
              <th className="px-3 py-2 w-[300px]">현장 운영</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.matchId} className="border-b align-top">
                <td className="px-3 py-3">{m.bracketTitle}</td>
                <td className="text-muted-foreground px-3 py-3 text-xs">
                  {m.divisionLabel ?? "—"}
                </td>
                <td className="px-3 py-3">{m.roundName ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-xs">
                  {m.matchNumber ?? m.globalMatchOrder ?? m.matchOrder}
                </td>
                <td className="px-3 py-3">{m.matNumber ?? "—"}</td>
                <td className="px-3 py-3 text-xs">
                  {m.fighterRed?.name ?? "—"}
                  <div className="text-muted-foreground">
                    {m.fighterRed?.gymName ?? ""}
                  </div>
                </td>
                <td className="px-3 py-3 text-xs">
                  {m.fighterBlue?.name ?? "—"}
                  <div className="text-muted-foreground">
                    {m.fighterBlue?.gymName ?? ""}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-[11px]">{m.status}</td>
                <td className="px-3 py-3 text-xs">
                  {m.isFinishedOps ? "예" : "아니오"}
                </td>
                <td className="px-3 py-3 text-xs">
                  {m.hasOfficialResults ? "확정" : "미확정"}
                </td>
                <td className="px-3 py-3">
                  <OrganizerMatchOpsPanel {...rowOps(m)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 xl:hidden">
        {sorted.map((m) => (
          <div
            key={m.matchId}
            className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm text-sm"
          >
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <span className="font-semibold">{m.bracketTitle}</span>
              <span className="text-muted-foreground">
                {m.roundName ?? "라운드 미상"} · 매트 {m.matNumber ?? "—"}
              </span>
            </div>
            <div className="text-muted-foreground text-[11px]">
              경기구분 {m.divisionLabel ?? "—"} · 상태 {m.status} · 운영 종료{" "}
              {m.isFinishedOps ? "예" : "아니오"} · 공식{" "}
              {m.hasOfficialResults ? "확정" : "미확정"}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border px-3 py-2 text-xs">
                <div className="text-muted-foreground">레드</div>
                <div className="font-medium">{m.fighterRed?.name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {m.fighterRed?.gymName ?? ""}
                </div>
              </div>
              <div className="rounded-md border px-3 py-2 text-xs">
                <div className="text-muted-foreground">블루</div>
                <div className="font-medium">{m.fighterBlue?.name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {m.fighterBlue?.gymName ?? ""}
                </div>
              </div>
            </div>
            <OrganizerMatchOpsPanel {...rowOps(m)} />
          </div>
        ))}
      </div>
    </div>
  );
}
