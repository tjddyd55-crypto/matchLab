"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type {
  GymEventApplicationStatusRowDTO,
  GymEventMatchRowDTO,
} from "@/lib/services/gym-event-status.service";
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
        <h2 className="text-lg font-semibold">우리 체육관 경기</h2>
        <p className="text-muted-foreground text-sm">
          대진표가 생성되면 소속 선수의 경기가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">우리 체육관 경기</h2>
        <Link
          href={`/events/${publicSlug}/brackets`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          공개 대진표 보기
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          배정된 경기가 없습니다. 승인·출전 확정 후 대진 배정을 확인해 주세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[40rem] text-left text-sm lg:min-w-[56rem]">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">선수명</th>
                <th className="px-3 py-2 font-medium">상대</th>
                <th className="px-3 py-2 font-medium">상대 체육관</th>
                <th className="px-3 py-2 font-medium">경기구분/체급</th>
                <th className="px-3 py-2 font-medium">경기 순서</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {matches.map((m) => (
                <tr key={`${m.matchId}-${m.fighterId}`}>
                  <td className="px-3 py-3 font-medium">{m.fighterName}</td>
                  <td className="px-3 py-3">{m.opponentName ?? "미정"}</td>
                  <td className="px-3 py-3 text-xs">
                    {m.opponentGymName ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-xs">{m.divisionLabel}</td>
                  <td className="px-3 py-3 text-xs">
                    {m.matchNumber != null ? `#${m.matchNumber}` : "—"}
                    {m.globalMatchOrder != null
                      ? ` · 전역 ${m.globalMatchOrder}`
                      : ""}
                  </td>
                  <td className="px-3 py-3 text-xs">{m.matchStatusLabel}</td>
                  <td className="px-3 py-3 text-xs">{m.resultSummary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unassignedFighters.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">미배정 선수</h3>
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {unassignedFighters.map((f) => (
              <li key={f.fighterId}>
                {f.fighterName} · {f.divisionLabel}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
