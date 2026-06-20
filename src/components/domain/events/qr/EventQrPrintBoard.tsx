"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EventQrCard, type EventQrPrintGroup } from "./EventQrCard";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  buildCourtHeadJudgeUrl,
  buildCourtScoreJudgeUrl,
  buildEventBracketQrUrl,
  buildEventLiveQrUrl,
  buildEventResultsQrUrl,
  buildPublicEventQrUrl,
  buildSpectatorWatchUnifiedQrUrl,
  isSpectatorOverviewQrEnabled,
  isSpectatorTabQrEnabled,
  spectatorTabQrDisabledReason,
  type SpectatorQrAvailabilityContext,
} from "@/lib/qr-url";
import type { EventStatus } from "@/lib/enums";
import "./event-qr-print.css";

/** 레거시 심판 로그인 QR — 코드 유지, 출력 UI에서는 숨김 */
const SHOW_LEGACY_JUDGE_LOGIN_QR = false;

export type EventQrPrintBoardProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventStatus: EventStatus;
  publicSlug: string | null;
  liveStreamingEnabled: boolean;
  publicLiveStreamCount: number;
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: string | null;
  spectatorAccessEndAt: string | null;
  baseUrl: string;
  courts: EventCourtVM[];
};

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function printPreset(preset: EventQrPrintGroup | "all") {
  document.body.dataset.eventQrPrint = preset;
  window.print();
  window.setTimeout(() => {
    delete document.body.dataset.eventQrPrint;
  }, 500);
}

export function EventQrPrintBoard({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  eventStatus,
  publicSlug,
  liveStreamingEnabled,
  publicLiveStreamCount,
  spectatorAccessEnabled,
  spectatorAccessStartAt,
  spectatorAccessEndAt,
  baseUrl,
  courts,
}: EventQrPrintBoardProps) {
  const slug = publicSlug?.trim() ?? "";
  const formattedDate = formatEventDate(eventDate);

  const spectatorCtx: SpectatorQrAvailabilityContext = {
    status: eventStatus,
    publicSlug,
    spectatorAccessEnabled,
    spectatorAccessStartAt,
    spectatorAccessEndAt,
    liveStreamingEnabled,
    publicLiveStreamCount,
  };

  const overviewQrEnabled = isSpectatorOverviewQrEnabled(spectatorCtx);

  const spectatorCards = [
    {
      printGroup: "spectator-all" as const,
      tab: "overview" as const,
      title: "관람 통합",
      description: "대진표·결과·라이브를 한 화면에서 봅니다.",
      url: buildSpectatorWatchUnifiedQrUrl(slug, baseUrl),
      disabled: !isSpectatorTabQrEnabled(spectatorCtx, "brackets"),
    },
    {
      printGroup: "spectator-overview" as const,
      tab: "overview" as const,
      title: "대회 안내",
      description: "대회 공고·오시는 길을 바로 봅니다.",
      url: buildPublicEventQrUrl(slug, "overview", baseUrl),
      disabled: !overviewQrEnabled,
    },
    {
      printGroup: "spectator-brackets" as const,
      tab: "brackets" as const,
      title: "대진표",
      description: "대진표 바로 보기",
      url: buildEventBracketQrUrl(slug, baseUrl),
      disabled: !isSpectatorTabQrEnabled(spectatorCtx, "brackets"),
    },
    {
      printGroup: "spectator-results" as const,
      tab: "results" as const,
      title: "결과",
      description: "경기 결과 확인",
      url: buildEventResultsQrUrl(slug, baseUrl),
      disabled: !isSpectatorTabQrEnabled(spectatorCtx, "results"),
    },
    {
      printGroup: "spectator-live" as const,
      tab: "live" as const,
      title: "라이브",
      description: "라이브 방송 보기",
      url: buildEventLiveQrUrl(slug, baseUrl),
      disabled: !isSpectatorTabQrEnabled(spectatorCtx, "live"),
    },
  ];

  const printAll = useCallback(() => printPreset("all"), []);

  return (
    <div className="event-qr-board space-y-8">
      <section className="no-print space-y-3 rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">인쇄 옵션</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          현장 부착용 A4 인쇄입니다. 브라우저 인쇄 미리보기에서 QR 크기와
          여백을 확인한 뒤 출력하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {SHOW_LEGACY_JUDGE_LOGIN_QR ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printPreset("judge-common")}
              >
                심판석용 QR만
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printPreset("judge-individual")}
              >
                심판별 QR 모음
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("judge-court-score")}
          >
            경기장 채점 QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("judge-court-head")}
          >
            경기장 주심 QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-all")}
            disabled={!overviewQrEnabled}
          >
            관람객 QR 모음
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-brackets")}
            disabled={!isSpectatorTabQrEnabled(spectatorCtx, "brackets")}
          >
            대진표 QR만
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-results")}
            disabled={!isSpectatorTabQrEnabled(spectatorCtx, "results")}
          >
            결과 QR만
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-live")}
            disabled={!isSpectatorTabQrEnabled(spectatorCtx, "live")}
          >
            라이브 QR만
          </Button>
          <Button type="button" size="sm" onClick={printAll}>
            전체 QR 인쇄
          </Button>
        </div>
      </section>

      <div className="event-qr-print-header hidden print:block">
        <h1 className="text-xl font-bold">{eventTitle}</h1>
        {formattedDate ? (
          <p className="text-sm">{formattedDate}</p>
        ) : null}
        {eventLocation ? (
          <p className="text-sm">{eventLocation}</p>
        ) : null}
      </div>

      {courts.length > 0 ? (
        <section className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">경기장별 심판 QR</h2>
            <p className="text-muted-foreground text-sm">
              각 경기장에 채점심판용/주심판용 QR을 따로 부착합니다. QR 접속 후
              이름과 생년월일을 입력하세요.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courts.map((court) => (
              <EventQrCard
                key={`${court.id}-score`}
                printGroup="judge-court-score"
                title={`${court.name} 채점심판`}
                description="진행중 경기만 채점합니다."
                steps="이름·생년월일 입력 → 진행중 경기 확인 → 점수 전송"
                url={buildCourtScoreJudgeUrl(court.id, baseUrl)}
                downloadFileName={`court-score-${court.name}.png`}
              />
            ))}
            {courts.map((court) => (
              <EventQrCard
                key={`${court.id}-head`}
                printGroup="judge-court-head"
                title={`${court.name} 주심판`}
                description="경기 시작, 승패 입력, 완료, 경기취소를 처리합니다."
                steps="이름·생년월일 입력 → 경기 시작 → 채점 확인 → 승패 입력/완료"
                url={buildCourtHeadJudgeUrl(court.id, baseUrl)}
                downloadFileName={`court-head-${court.name}.png`}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          활성 경기장이 없습니다. 경기장을 등록한 뒤 경기장별 심판 QR을 출력하세요.
        </p>
      )}

      {SHOW_LEGACY_JUDGE_LOGIN_QR ? (
        <>
          <section className="space-y-4">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold">심판 로그인 QR</h2>
              <p className="text-muted-foreground text-sm">
                심판석 앞에 부착할 공용 로그인 QR입니다. 비밀번호·세션 토큰은 QR에
                포함하지 않습니다.
              </p>
            </header>
          </section>

          <section className="space-y-4">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold">심판별 로그인 QR</h2>
            </header>
          </section>
        </>
      ) : null}

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">관람객용 QR</h2>
          <p className="text-muted-foreground text-sm">
            공개 페이지 URL만 사용합니다. organizer·admin·judge 경로는 포함하지
            않습니다.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spectatorCards.map((card) => (
            <EventQrCard
              key={card.printGroup}
              printGroup={card.printGroup}
              title={card.title}
              description={card.description}
              url={card.url}
              disabled={card.disabled}
              disabledReason={spectatorTabQrDisabledReason(
                spectatorCtx,
                card.tab,
              )}
              downloadFileName={`spectator-${card.printGroup}-${slug || eventId}.png`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
