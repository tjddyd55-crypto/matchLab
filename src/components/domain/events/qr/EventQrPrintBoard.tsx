"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EventQrCard, type EventQrPrintGroup } from "./EventQrCard";
import type { JudgeCredentialListItemVM } from "@/lib/services/judge-credential.service";
import {
  buildEventBracketQrUrl,
  buildEventLiveQrUrl,
  buildEventResultsQrUrl,
  buildJudgeLoginQrUrl,
  buildPublicEventQrUrl,
  isEventPublicForSpectatorQr,
} from "@/lib/qr-url";
import type { EventStatus } from "@/lib/enums";
import "./event-qr-print.css";

export type EventQrPrintBoardProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventStatus: EventStatus;
  publicSlug: string | null;
  liveStreamingEnabled: boolean;
  baseUrl: string;
  credentials: JudgeCredentialListItemVM[];
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
  baseUrl,
  credentials,
}: EventQrPrintBoardProps) {
  const spectatorEnabled = isEventPublicForSpectatorQr(
    eventStatus,
    publicSlug,
  );
  const slug = publicSlug?.trim() ?? "";
  const formattedDate = formatEventDate(eventDate);

  const judgeCommonUrl = buildJudgeLoginQrUrl(eventId, null, baseUrl);

  const spectatorCards = [
    {
      printGroup: "spectator-all" as const,
      title: "대회 전체",
      description: "대회 공개 페이지로 바로 이동합니다.",
      url: buildPublicEventQrUrl(slug, "overview", baseUrl),
    },
    {
      printGroup: "spectator-brackets" as const,
      title: "대진표",
      description: "대진표 바로 보기",
      url: buildEventBracketQrUrl(slug, baseUrl),
    },
    {
      printGroup: "spectator-results" as const,
      title: "결과",
      description: "경기 결과 확인",
      url: buildEventResultsQrUrl(slug, baseUrl),
    },
    {
      printGroup: "spectator-live" as const,
      title: "라이브",
      description: "라이브 방송 보기",
      url: buildEventLiveQrUrl(slug, baseUrl),
      disabled: !liveStreamingEnabled,
      disabledReason: liveStreamingEnabled
        ? undefined
        : "라이브 스트리밍이 비활성화되어 있습니다. 대회 설정에서 켠 뒤 QR을 사용하세요.",
    },
    {
      printGroup: "spectator-overview" as const,
      title: "오시는 길·행사 안내",
      description: "대회 안내 바로 보기",
      url: buildPublicEventQrUrl(slug, "overview", baseUrl),
    },
  ];

  const spectatorDisabledReason = !slug
    ? "공개 slug가 설정되지 않았습니다. 기본 설정에서 slug를 등록하세요."
    : !spectatorEnabled
      ? "작성 중(draft) 또는 취소된 대회는 관람객 QR을 사용할 수 없습니다. 신청 공개(OPEN) 이후 상태에서 활성화됩니다."
      : undefined;

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-all")}
            disabled={!spectatorEnabled}
          >
            관람객 QR 모음
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-brackets")}
            disabled={!spectatorEnabled}
          >
            대진표 QR만
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-results")}
            disabled={!spectatorEnabled}
          >
            결과 QR만
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printPreset("spectator-live")}
            disabled={!spectatorEnabled || !liveStreamingEnabled}
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

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">심판 로그인 QR</h2>
          <p className="text-muted-foreground text-sm">
            심판석 앞에 부착할 공용 로그인 QR입니다. 비밀번호·세션 토큰은 QR에
            포함하지 않습니다.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <EventQrCard
            printGroup="judge-common"
            title="심판 로그인"
            description="QR을 스캔한 뒤 부여받은 심판 아이디와 비밀번호로 로그인해 주세요."
            steps="로그인 → 본인 확인 → 배정 경기 선택 → 채점 제출"
            url={judgeCommonUrl}
            downloadFileName={`judge-login-${eventId}.png`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">심판별 로그인 QR</h2>
          <p className="text-muted-foreground text-sm">
            심판 A/B/C 등 역할별로 나눠 줄 QR입니다. 로그인 ID만 자동 입력하며
            비밀번호는 직접 입력해야 합니다.
          </p>
        </header>
        {credentials.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            등록된 심판 계정이 없습니다.{" "}
            <a
              href={`/organizer/events/${eventId}/judges`}
              className="text-primary underline"
            >
              심판 관리
            </a>
            에서 계정을 만든 뒤 QR을 출력하세요.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {credentials.map((cred) => (
              <EventQrCard
                key={cred.id}
                printGroup="judge-individual"
                title={cred.displayName?.trim() || cred.loginId}
                subtitle={`loginId: ${cred.loginId}`}
                badge={cred.roleLabel}
                meta={
                  cred.identityConfirmed
                    ? "본인 확인 완료"
                    : "본인 확인 전"
                }
                description="이 QR은 로그인 ID만 자동 입력합니다. 비밀번호는 직접 입력해야 합니다."
                steps="로그인 → 본인 확인 → 배정 경기 선택 → 채점 제출"
                url={buildJudgeLoginQrUrl(eventId, cred.loginId, baseUrl)}
                downloadFileName={`judge-${cred.loginId}.png`}
              />
            ))}
          </div>
        )}
      </section>

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
              disabled={!spectatorEnabled || card.disabled}
              disabledReason={
                card.disabled
                  ? card.disabledReason
                  : spectatorDisabledReason
              }
              downloadFileName={`spectator-${card.printGroup}-${slug || eventId}.png`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
