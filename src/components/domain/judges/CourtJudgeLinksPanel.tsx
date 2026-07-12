"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CourtJudgeCourtCard } from "@/components/domain/judges/CourtJudgeCourtCard";
import {
  CourtJudgeLinksSummaryCards,
  type CourtFilter,
} from "@/components/domain/judges/CourtJudgeLinksSummaryCards";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonTabs } from "@/components/shared/MatchonTabs";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { formatCourtTabLabel } from "@/lib/court-tab-label";
import type { CourtJudgeQrLinkVM } from "@/lib/qr-url";
import "@/components/domain/events/qr/event-qr-print.css";

const FILTER_TABS: { id: CourtFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "active", label: "활성" },
  { id: "inactive", label: "비활성" },
];

export function CourtJudgeLinksPanel({
  courts,
  courtQrLinks,
  eventId,
}: {
  courts: Pick<EventCourtVM, "id" | "name" | "isActive">[];
  courtQrLinks: CourtJudgeQrLinkVM[];
  eventId: string;
}) {
  const [filter, setFilter] = useState<CourtFilter>("all");

  const linksByCourtId = useMemo(
    () => new Map(courtQrLinks.map((link) => [link.id, link] as const)),
    [courtQrLinks],
  );

  const activeCount = courts.filter((court) => court.isActive).length;
  const inactiveCount = courts.length - activeCount;

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      if (filter === "active") return court.isActive;
      if (filter === "inactive") return !court.isActive;
      return true;
    });
  }, [courts, filter]);

  if (courts.length === 0) {
    return (
      <section className="rounded-xl border border-dashed p-6 text-sm">
        <FeedbackMessage tone="info">
          활성 경기장이 없습니다.{" "}
          <Link
            href={`/organizer/events/${eventId}/courts`}
            className="text-primary font-medium underline"
          >
            경기장 관리
          </Link>
          에서 경기장을 먼저 등록하세요.
        </FeedbackMessage>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CourtJudgeLinksSummaryCards
        totalCourts={courts.length}
        activeCourts={activeCount}
        inactiveCourts={inactiveCount}
        linkCount={courtQrLinks.length * 2}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium">경기장 필터</p>
        <MatchonTabs items={FILTER_TABS} activeId={filter} onChange={setFilter} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">경기장별 심판 QR · URL</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            QR 접속 후 이름과 생년월일을 입력하세요. 채점심판은 진행중 경기만
            채점하고, 주심판은 경기 시작·승패 입력·완료·취소를 처리합니다. QR
            출력 화면에서 A4 인쇄용 QR도 확인할 수 있습니다.
          </p>
        </div>

        {filteredCourts.length === 0 ? (
          <FeedbackMessage tone="info">
            선택한 필터에 해당하는 경기장이 없습니다.
          </FeedbackMessage>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourts.map((court, index) => (
              <CourtJudgeCourtCard
                key={court.id}
                courtLabel={formatCourtTabLabel(court, index)}
                isActive={court.isActive}
                links={linksByCourtId.get(court.id) ?? null}
                eventId={eventId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
