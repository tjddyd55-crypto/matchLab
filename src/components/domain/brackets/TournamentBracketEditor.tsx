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
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { formatCourtTabLabel } from "@/lib/court-tab-label";
import { getBracketDisabledFighterIds } from "@/lib/bracket-match-placement";
import { cn } from "@/lib/utils";
import { BracketType } from "@/lib/enums";
import { organizerBracketFieldInputClass, organizerBracketFieldSelectClass } from "@/lib/ui/organizer-bracket-ui";

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
      className="mt-2 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="matchId" value={m.id} />
      <label className="space-y-1.5 text-sm">
        <span className="font-medium">매치 순서</span>
        <input
          name="matchOrder"
          type="number"
          min={0}
          defaultValue={m.matchOrder}
          className={cn(organizerBracketFieldInputClass, "w-full sm:w-24")}
        />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-medium">전체 순서</span>
        <input
          name="globalMatchOrder"
          type="number"
          min={0}
          defaultValue={m.globalMatchOrder ?? ""}
          placeholder="선택"
          className={cn(organizerBracketFieldInputClass, "w-full sm:w-28")}
        />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-medium">매트</span>
        <input
          name="matNumber"
          type="number"
          min={1}
          defaultValue={m.matNumber ?? ""}
          placeholder="선택"
          className={cn(organizerBracketFieldInputClass, "w-full sm:w-24")}
        />
      </label>
      <Button type="submit" size="field" className="w-full sm:w-auto">
        순서·매트 적용
      </Button>
    </form>
  );
}

function SlotAssignForms({
  detail,
  m,
  sortedMatches,
  slot,
}: {
  detail: OrganizerBracketDetailVM;
  m: OrganizerBracketMatchVM;
  sortedMatches: OrganizerBracketMatchVM[];
  slot: "red" | "blue";
}) {
  const label = slot === "red" ? "레드" : "블루";
  const currentName =
    slot === "red"
      ? (m.fighterRedSnapshot?.name ?? "미배정")
      : (m.fighterBlueSnapshot?.name ?? "미배정 · 부전승 가능");

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-xs">
        {label}: {currentName}
      </div>
      <form
        action={assignFighterToMatchFormAction}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <input type="hidden" name="bracketId" value={detail.id} />
        <input type="hidden" name="matchId" value={m.id} />
        <input type="hidden" name="slot" value={slot} />
        <ApprovedApplicationPicker
          name="fighterId"
          value=""
          options={detail.approvedFighterOptions}
          disabledOptionIds={getBracketDisabledFighterIds(
            sortedMatches,
            m.id,
            slot,
          )}
          placeholder={`${label} 선택`}
          className="max-w-none sm:min-w-[12rem] sm:flex-1"
        />
        <Button type="submit" size="field" className="w-full sm:w-auto">
          {label} 배치
        </Button>
      </form>
      <form action={removeFighterFromMatchFormAction}>
        <input type="hidden" name="bracketId" value={detail.id} />
        <input type="hidden" name="matchId" value={m.id} />
        <input type="hidden" name="slot" value={slot} />
        <Button type="submit" variant="outline" size="field" className="w-full sm:w-auto">
          {label} 제거
        </Button>
      </form>
    </div>
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
  const activeCourts = courts.filter((c) => c.isActive);
  const defaultCourtId = activeCourts[0]?.id ?? "";

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">토너먼트 드래프트</CardTitle>
          <CardDescription>
            4·8·16 슬롯 트리를 생성합니다. 서버에서 다음 라운드용 링크
            (`nextMatchId`/`nextMatchSlot`)까지 채우며, 승자 자동 진출은 결과 단계에서
            처리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={createSingleEliminationDraftFormAction}
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <input type="hidden" name="bracketId" value={detail.id} />
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">슬롯 수</span>
              <select
                name="slotCount"
                defaultValue={8}
                className={organizerBracketFieldSelectClass}
              >
                <option value={4}>4명</option>
                <option value={8}>8명</option>
                <option value={16}>16명</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">경기장 (필수)</span>
              <select
                name="courtId"
                defaultValue={defaultCourtId}
                required
                disabled={activeCourts.length === 0}
                className={organizerBracketFieldSelectClass}
              >
                {activeCourts.length === 0 ? (
                  <option value="">경기장 없음</option>
                ) : (
                  activeCourts.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      {formatCourtTabLabel(c, idx)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <Button
              type="submit"
              variant="secondary"
              size="field"
              className="w-full sm:w-auto"
              disabled={activeCourts.length === 0}
            >
              드래프트 생성
            </Button>
          </form>
          {activeCourts.length === 0 ? (
            <FeedbackMessage tone="error" role="alert">
              활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
            </FeedbackMessage>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="danger">
        <CardHeader>
          <CardTitle className="text-base text-destructive">매치 전체 초기화</CardTitle>
          <CardDescription>
            대진표의 모든 매치를 삭제하고 처음부터 다시 구성합니다. 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={resetBracketFormAction}>
            <input type="hidden" name="bracketId" value={detail.id} />
            <Button type="submit" variant="destructive" size="field" className="w-full sm:w-auto">
              매치 전체 초기화
            </Button>
          </form>
        </CardContent>
      </Card>

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
                    <SlotAssignForms
                      detail={detail}
                      m={m}
                      sortedMatches={sortedMatches}
                      slot="red"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <SlotAssignForms
                      detail={detail}
                      m={m}
                      sortedMatches={sortedMatches}
                      slot="blue"
                    />
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
          <Card key={m.id}>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-sm font-medium">
                {m.roundName ?? `R${m.round ?? "-"}`} · {m.id.slice(-6)}
              </CardTitle>
              <CardDescription>
                {m.courtName ? (
                  <>
                    {m.courtName}
                    {m.courtOrder != null ? ` · ${m.courtOrder}경기` : ""}
                  </>
                ) : (
                  "경기장 미배정"
                )}
                {" · 다음: "}
                {m.nextMatchId ? (
                  <>
                    {m.nextMatchId.slice(-6)}
                    {m.nextMatchSlot ? ` · ${m.nextMatchSlot}` : ""}
                  </>
                ) : (
                  "없음"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3 border-b pb-4">
                <SlotAssignForms
                  detail={detail}
                  m={m}
                  sortedMatches={sortedMatches}
                  slot="red"
                />
              </div>
              <div className="space-y-3 border-b pb-4">
                <SlotAssignForms
                  detail={detail}
                  m={m}
                  sortedMatches={sortedMatches}
                  slot="blue"
                />
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
