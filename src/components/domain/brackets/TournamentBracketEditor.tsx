"use client";

import { Fragment } from "react";
import {
  assignFighterToMatchFormAction,
  createSingleEliminationDraftFormAction,
  removeFighterFromMatchFormAction,
  resetBracketFormAction,
  updateMatchOrderAndMatFormAction,
} from "@/features/brackets/actions";
import type {
  OrganizerBracketDetailVM,
  OrganizerBracketMatchVM,
} from "@/lib/services/bracket.service";
import { ApprovedApplicationPicker } from "@/components/domain/brackets/ApprovedApplicationPicker";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { MatchCourtControls } from "@/components/domain/courts/MatchCourtControls";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { getBracketDisabledFighterIds } from "@/lib/bracket-match-placement";
import { cn } from "@/lib/utils";
import { BracketType } from "@/lib/enums";

function tournamentMatchOpsProps(
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
    fighterBlueName: m.fighterBlueSnapshot?.name ?? "미배정 · 부전승 가능",
    hasOfficialResults: m.hasOfficialResults,
    winnerId: m.winnerId,
    resultType: m.resultType,
    resultMemo: m.resultMemo,
    compact: true as const,
  };
}

function MatchControls({ m }: { m: OrganizerBracketMatchVM }) {
  return (
    <form
      action={updateMatchOrderAndMatFormAction}
      className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2 text-xs"
    >
      <input type="hidden" name="matchId" value={m.id} />
      <label className="space-y-1">
        <span className="text-muted-foreground text-[11px]">매치 순서</span>
        <input
          name="matchOrder"
          type="number"
          min={0}
          defaultValue={m.matchOrder}
          className={cn(
            "border-input bg-background h-8 w-20 rounded-md border px-2 text-xs",
          )}
        />
      </label>
      <label className="space-y-1">
        <span className="text-muted-foreground text-[11px]">전체 순서</span>
        <input
          name="globalMatchOrder"
          type="number"
          min={0}
          defaultValue={m.globalMatchOrder ?? ""}
          placeholder="선택"
          className={cn(
            "border-input bg-background h-8 w-24 rounded-md border px-2 text-xs",
          )}
        />
      </label>
      <label className="space-y-1">
        <span className="text-muted-foreground text-[11px]">매트</span>
        <input
          name="matNumber"
          type="number"
          min={1}
          defaultValue={m.matNumber ?? ""}
          placeholder="선택"
          className={cn(
            "border-input bg-background h-8 w-20 rounded-md border px-2 text-xs",
          )}
        />
      </label>
      <Button type="submit" size="sm">
        순서·매트 적용
      </Button>
    </form>
  );
}

export function TournamentBracketEditor({
  eventId,
  courts,
  detail,
}: {
  eventId: string;
  courts: EventCourtVM[];
  detail: OrganizerBracketDetailVM;
}) {
  const sortedMatches = [...detail.matches].sort((a, b) => {
    const ra = a.round ?? -1;
    const rb = b.round ?? -1;
    if (ra !== rb) return ra - rb;
    return a.matchOrder - b.matchOrder;
  });

  return (
    <div className="space-y-8">
      <div className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">토너먼트 드래프트</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          4·8·16 슬롯 트리를 생성합니다. 서버에서 다음 라운드용 링크
          (`nextMatchId`/`nextMatchSlot`)까지 채우며, 승자 자동 진출은 결과 단계에서
          처리합니다.
        </p>
        <form
          action={createSingleEliminationDraftFormAction}
          className="mt-4 flex flex-wrap items-end gap-3 text-sm"
        >
          <input type="hidden" name="bracketId" value={detail.id} />
          <label className="space-y-1">
            <span className="text-muted-foreground text-xs">슬롯 수</span>
            <select
              name="slotCount"
              defaultValue={8}
              className={cn(
                "border-input bg-background h-9 rounded-md border px-2 text-sm",
              )}
            >
              <option value={4}>4명</option>
              <option value={8}>8명</option>
              <option value={16}>16명</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm">
            드래프트 생성
          </Button>
        </form>

        <form action={resetBracketFormAction} className="mt-3 flex gap-2">
          <input type="hidden" name="bracketId" value={detail.id} />
          <Button type="submit" variant="destructive" size="sm">
            매치 전체 초기화
          </Button>
        </form>
      </div>

      <div className="hidden xl:block overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-medium uppercase">
            <tr>
              <th className="px-3 py-2">라운드</th>
              <th className="px-3 py-2">슬롯</th>
              <th className="px-3 py-2">다음 매치</th>
              <th className="px-3 py-2">레드 배치</th>
              <th className="px-3 py-2">블루 배치</th>
            </tr>
          </thead>
          <tbody>
            {sortedMatches.map((m) => (
              <Fragment key={m.id}>
                <tr className="border-b align-top">
                  <td className="text-muted-foreground px-3 py-3 whitespace-pre-wrap">
                    {m.roundName ?? `R${m.round ?? "-"}`}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{m.id.slice(-6)}</td>
                  <td className="text-muted-foreground px-3 py-3 text-xs">
                    {m.nextMatchId ? (
                      <>
                        →{" "}
                        <span className="font-mono">
                          {m.nextMatchId.slice(-6)}
                        </span>
                        {m.nextMatchSlot ? ` · ${m.nextMatchSlot}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-muted-foreground mb-1 text-[11px]">
                      현재: {m.fighterRedSnapshot?.name ?? "미배정"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={assignFighterToMatchFormAction}
                        className="flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="bracketId" value={detail.id} />
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="slot" value="red" />
                        <ApprovedApplicationPicker
                          name="fighterId"
                          value=""
                          options={detail.approvedFighterOptions}
                          disabledOptionIds={getBracketDisabledFighterIds(
                            sortedMatches,
                            m.id,
                            "red",
                          )}
                          placeholder="레드 선택"
                        />
                        <Button type="submit" size="xs">
                          배치
                        </Button>
                      </form>
                      <form action={removeFighterFromMatchFormAction}>
                        <input type="hidden" name="bracketId" value={detail.id} />
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="slot" value="red" />
                        <Button type="submit" variant="outline" size="xs">
                          제거
                        </Button>
                      </form>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-muted-foreground mb-1 text-[11px]">
                      현재:{" "}
                      {m.fighterBlueSnapshot?.name ?? "미배정 · 부전승 가능"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={assignFighterToMatchFormAction}
                        className="flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="bracketId" value={detail.id} />
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="slot" value="blue" />
                        <ApprovedApplicationPicker
                          name="fighterId"
                          value=""
                          options={detail.approvedFighterOptions}
                          disabledOptionIds={getBracketDisabledFighterIds(
                            sortedMatches,
                            m.id,
                            "blue",
                          )}
                          placeholder="블루 선택"
                        />
                        <Button type="submit" size="xs">
                          배치
                        </Button>
                      </form>
                      <form action={removeFighterFromMatchFormAction}>
                        <input type="hidden" name="bracketId" value={detail.id} />
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="slot" value="blue" />
                        <Button type="submit" variant="outline" size="xs">
                          제거
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-border last:border-0 bg-muted/15">
                  <td colSpan={5} className="px-3 py-2">
                    <MatchControls m={m} />
                    <div className="mt-2">
                      <MatchCourtControls
                        inline
                        eventId={eventId}
                        bracketId={detail.id}
                        matchId={m.id}
                        courts={courts}
                        courtId={m.courtId}
                        courtOrder={m.courtOrder}
                        hasOfficialResults={m.hasOfficialResults}
                      />
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-border last:border-0 bg-muted/25">
                  <td colSpan={5} className="px-3 py-3">
                    <OrganizerMatchOpsPanel
                      {...tournamentMatchOpsProps(m, detail.type)}
                    />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 xl:hidden">
        {sortedMatches.map((m) => (
          <div
            key={m.id}
            className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm text-sm"
          >
            <div className="text-muted-foreground text-xs">
              {m.roundName ?? `R${m.round ?? "-"}`} · {m.id.slice(-6)}
              {m.courtName ? (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                  {m.courtName}
                  {m.courtOrder != null ? ` · ${m.courtOrder}경기` : ""}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground text-xs">
              다음:{" "}
              {m.nextMatchId ? (
                <>
                  {m.nextMatchId.slice(-6)}
                  {m.nextMatchSlot ? ` · ${m.nextMatchSlot}` : ""}
                </>
              ) : (
                "없음"
              )}
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground text-[11px]">
                레드: {m.fighterRedSnapshot?.name ?? "미배정"}
              </div>
              <form
                action={assignFighterToMatchFormAction}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="bracketId" value={detail.id} />
                <input type="hidden" name="matchId" value={m.id} />
                <input type="hidden" name="slot" value="red" />
                <ApprovedApplicationPicker
                  name="fighterId"
                  value=""
                  options={detail.approvedFighterOptions}
                  disabledOptionIds={getBracketDisabledFighterIds(
                    sortedMatches,
                    m.id,
                    "red",
                  )}
                  placeholder="레드 선택"
                  className="max-w-none"
                />
                <Button type="submit" size="sm">
                  레드 배치
                </Button>
              </form>
              <form action={removeFighterFromMatchFormAction}>
                <input type="hidden" name="bracketId" value={detail.id} />
                <input type="hidden" name="matchId" value={m.id} />
                <input type="hidden" name="slot" value="red" />
                <Button type="submit" variant="outline" size="sm">
                  레드 제거
                </Button>
              </form>
            </div>
            <div className="space-y-2 border-t pt-3">
              <div className="text-muted-foreground text-[11px]">
                블루: {m.fighterBlueSnapshot?.name ?? "미배정"}
              </div>
              <form
                action={assignFighterToMatchFormAction}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="bracketId" value={detail.id} />
                <input type="hidden" name="matchId" value={m.id} />
                <input type="hidden" name="slot" value="blue" />
                <ApprovedApplicationPicker
                  name="fighterId"
                  value=""
                  options={detail.approvedFighterOptions}
                  disabledOptionIds={getBracketDisabledFighterIds(
                    sortedMatches,
                    m.id,
                    "blue",
                  )}
                  placeholder="블루 선택"
                  className="max-w-none"
                />
                <Button type="submit" size="sm">
                  블루 배치
                </Button>
              </form>
              <form action={removeFighterFromMatchFormAction}>
                <input type="hidden" name="bracketId" value={detail.id} />
                <input type="hidden" name="matchId" value={m.id} />
                <input type="hidden" name="slot" value="blue" />
                <Button type="submit" variant="outline" size="sm">
                  블루 제거
                </Button>
              </form>
            </div>
            <MatchControls m={m} />
            <MatchCourtControls
              eventId={eventId}
              bracketId={detail.id}
              matchId={m.id}
              courts={courts}
              courtId={m.courtId}
              courtOrder={m.courtOrder}
              hasOfficialResults={m.hasOfficialResults}
            />
            <OrganizerMatchOpsPanel
              {...tournamentMatchOpsProps(m, detail.type)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
