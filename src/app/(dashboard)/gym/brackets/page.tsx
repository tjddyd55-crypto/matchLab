import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymEventStatusService } from "@/lib/services/gym-event-status.service";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymBracketsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await searchParams;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  let board: Awaited<
    ReturnType<typeof gymEventStatusService.listGymBracketBoard>
  >;
  try {
    board = await gymEventStatusService.listGymBracketBoard(actor, {
      eventId: eventId?.trim() || undefined,
    });
  } catch (e) {
    const message =
      e instanceof AppError ? e.message : "대진표를 불러오지 못했습니다.";
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <MatchonEmptyState
            title="조회할 수 없습니다"
            description={message}
            tone="error"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <header className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>대진표 확인</h1>
          <p className={matchonPageDescClass}>
            체육관 소속 선수의 공개된 대진표와 경기 일정을 확인할 수 있습니다.
            대진표 생성·수정은 주최자만 가능합니다.
          </p>
        </header>

        {board.events.length === 0 ? (
          <MatchonEmptyState
            title="표시할 대진표가 없습니다"
            description="신청한 대회가 있으면 여기에 표시됩니다. 대진표가 공개되면 경기 정보가 나타납니다."
            action={
              <Link
                href="/gym/events"
                className={cn(
                  buttonVariants({ variant: "default", size: "field" }),
                  "inline-flex",
                )}
              >
                대회 목록
              </Link>
            }
          />
        ) : (
          board.events.map((ev) => (
            <section key={ev.eventId} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className={matchonSectionTitleClass}>{ev.eventTitle}</h2>
                  {ev.eventDate ? (
                    <p className="text-sm text-matchon-text-secondary">
                      대회일 {ev.eventDate}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ev.hasPublicBrackets && ev.publicSlug ? (
                    <Link
                      href={`/events/${ev.publicSlug}/brackets`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "field" }),
                      )}
                    >
                      공개 대진표 보기
                    </Link>
                  ) : null}
                  <Link
                    href={`/gym/events/${ev.eventId}/status`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "field" }),
                    )}
                  >
                    신청 현황
                  </Link>
                </div>
              </div>

              {!ev.hasPublicBrackets ? (
                <p className="rounded-lg border border-matchon-border bg-slate-50 px-3 py-2 text-sm text-matchon-text-secondary">
                  아직 공개된 대진표가 없습니다.
                </p>
              ) : ev.matches.length === 0 ? (
                <div className="space-y-2">
                  <p className="rounded-lg border border-matchon-border bg-slate-50 px-3 py-2 text-sm text-matchon-text-secondary">
                    대진 배정 전입니다.
                  </p>
                  {ev.unassignedFighters.length > 0 ? (
                    <ul className="text-sm text-matchon-text-secondary">
                      {ev.unassignedFighters.map((f) => (
                        <li key={f.fighterId}>
                          {f.fighterName}
                          <span className="text-xs"> · {f.divisionLabel}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className={cn(matchonCompactTableWrapClass, "hidden md:block")}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>선수</TableHead>
                          <TableHead>체급·부문</TableHead>
                          <TableHead>상대</TableHead>
                          <TableHead>상대 소속</TableHead>
                          <TableHead>순서</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>결과</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ev.matches.map((m) => (
                          <TableRow key={m.matchId}>
                            <TableCell className="font-medium">
                              {m.fighterName}
                            </TableCell>
                            <TableCell className="text-xs text-matchon-text-secondary">
                              {m.divisionLabel}
                            </TableCell>
                            <TableCell>{m.opponentName ?? "—"}</TableCell>
                            <TableCell className="text-xs text-matchon-text-secondary">
                              {m.opponentGymName ?? "—"}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {m.globalMatchOrder ?? m.matchNumber ?? "—"}
                            </TableCell>
                            <TableCell>{m.matchStatusLabel}</TableCell>
                            <TableCell>{m.resultSummary ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 md:hidden">
                    {ev.matches.map((m) => (
                      <article
                        key={m.matchId}
                        className="rounded-xl border border-matchon-border bg-white p-3 text-sm"
                      >
                        <p className="font-semibold">{m.fighterName}</p>
                        <p className="text-xs text-matchon-text-secondary">
                          {m.divisionLabel}
                        </p>
                        <p className="mt-1">
                          vs {m.opponentName ?? "—"}
                          {m.opponentGymName ? ` (${m.opponentGymName})` : ""}
                        </p>
                        <p className="mt-1 text-xs text-matchon-text-secondary">
                          순서 {m.globalMatchOrder ?? m.matchNumber ?? "—"} ·{" "}
                          {m.matchStatusLabel}
                          {m.resultSummary ? ` · ${m.resultSummary}` : ""}
                        </p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
