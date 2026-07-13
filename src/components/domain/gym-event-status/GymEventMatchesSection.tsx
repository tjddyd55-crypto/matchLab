"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type {
  GymEventApplicationStatusRowDTO,
  GymEventMatchRowDTO,
} from "@/lib/services/gym-event-status.service";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonCompactTableWrapClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonCardStackClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function GymEventMatchesSection({
  publicSlug,
  bracketGenerated,
  matches,
  unassignedFighters,
}: {
  publicSlug: string;
  bracketGenerated: boolean;
  matches: GymEventMatchRowDTO[];
  unassignedFighters: GymEventApplicationStatusRowDTO[] | {
    fighterId: string;
    fighterName: string;
    divisionLabel: string;
  }[];
}) {
  if (!bracketGenerated) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className={matchonSectionTitleClass}>우리 체육관 경기</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          대진표가 생성되면 소속 선수의 경기가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className={matchonSectionTitleClass}>우리 체육관 경기</h2>
        <Link
          href={`/events/${publicSlug}/brackets`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "field" }),
            "w-full sm:w-auto",
          )}
        >
          공개 대진표 보기
        </Link>
      </div>

      {matches.length === 0 ? (
        <MatchonEmptyState
          title="배정된 경기가 없습니다"
          description="승인·출전 확정 후 대진 배정을 확인해 주세요."
        />
      ) : (
        <>
          <div
            className={cn(
              matchonCompactTableWrapClass,
              "hidden lg:block",
            )}
          >
            <Table className="min-w-[40rem] lg:min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>선수명</TableHead>
                  <TableHead>상대</TableHead>
                  <TableHead>상대 체육관</TableHead>
                  <TableHead>경기구분/체급</TableHead>
                  <TableHead>경기 순서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>결과</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={`${m.matchId}-${m.fighterId}`}>
                    <TableCell className="font-medium break-words">
                      {m.fighterName}
                    </TableCell>
                    <TableCell>{m.opponentName ?? "미정"}</TableCell>
                    <TableCell className="text-xs break-words">
                      {m.opponentGymName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs break-words">
                      {m.divisionLabel}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.matchNumber != null ? `#${m.matchNumber}` : "—"}
                      {m.globalMatchOrder != null
                        ? ` · 전역 ${m.globalMatchOrder}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-xs">{m.matchStatusLabel}</TableCell>
                    <TableCell className="text-xs">
                      {m.resultSummary ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className={cn("flex flex-col lg:hidden", matchonCardStackClass)}>
            {matches.map((m) => (
              <li key={`${m.matchId}-${m.fighterId}`}>
                <div className={cn(matchonVsCardClass, "overflow-hidden p-0")}>
                  <div className="space-y-1 border-b border-matchon-border bg-matchon-primary-light/20 px-4 py-3">
                    <p className="text-xs text-matchon-text-secondary">
                      {m.divisionLabel}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      {m.matchNumber != null ? `경기 #${m.matchNumber}` : "순서 미정"}
                      {m.matchStatusLabel ? ` · ${m.matchStatusLabel}` : ""}
                    </p>
                  </div>
                  <div className="grid items-stretch gap-2 p-4 sm:grid-cols-[1fr_auto_1fr]">
                    <div className={matchonRedCornerPanelClass}>
                      <p className="text-xs font-semibold text-red-700/80">홍코너</p>
                      <p className={cn(matchonRedCornerTextClass, "mt-1 break-words")}>
                        {m.fighterName}
                      </p>
                    </div>
                    <span className="self-center px-1 text-sm font-black text-matchon-text-secondary">
                      VS
                    </span>
                    <div className={matchonBlueCornerPanelClass}>
                      <p className="text-xs font-semibold text-blue-700/80">청코너</p>
                      <p className={cn(matchonBlueCornerTextClass, "mt-1 break-words")}>
                        {m.opponentName ?? "미정"}
                      </p>
                      {m.opponentGymName ? (
                        <p className="mt-1 text-xs text-blue-700/70">
                          {m.opponentGymName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {m.resultSummary ? (
                    <div className="border-t border-matchon-border px-4 py-3">
                      <p className="text-sm font-semibold">{m.resultSummary}</p>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {unassignedFighters.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">미배정 선수</h3>
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {unassignedFighters.map((f) => (
              <li key={f.fighterId} className="break-words">
                {f.fighterName} · {f.divisionLabel}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
