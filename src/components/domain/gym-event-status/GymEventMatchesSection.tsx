"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type {
  GymEventApplicationStatusRowDTO,
  GymEventMatchRowDTO,
} from "@/lib/services/gym-event-status.service";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
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
          <div className="hidden overflow-x-auto rounded-xl border lg:block">
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
              <li
                key={`${m.matchId}-${m.fighterId}`}
                className="rounded-xl border bg-card p-4"
              >
                <p className="font-medium break-words">{m.fighterName}</p>
                <p className="text-muted-foreground mt-1 text-xs break-words">
                  vs {m.opponentName ?? "미정"}
                  {m.opponentGymName ? ` · ${m.opponentGymName}` : ""}
                </p>
                <p className="text-muted-foreground mt-2 text-xs break-words">
                  {m.divisionLabel}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {m.matchNumber != null ? `경기 #${m.matchNumber}` : "순서 미정"}
                  {m.matchStatusLabel ? ` · ${m.matchStatusLabel}` : ""}
                </p>
                {m.resultSummary ? (
                  <p className="mt-2 text-sm font-medium">{m.resultSummary}</p>
                ) : null}
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
