"use client";

import type { OrganizerApplicationDisplayStatus } from "@/lib/application-display-status";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OrganizerApplicationFiltersState = {
  displayStatus: OrganizerApplicationDisplayStatus | "all";
  paymentDisplay: "all" | "unpaid" | "paid";
  divisionId: string;
  gymId: string;
  consent: string;
  fighterName: string;
};

const selectClass =
  "border-input bg-background h-10 rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9";

export function OrganizerApplicationsFilterBar({
  filters,
  onChange,
  divisionOptions,
  gymOptions,
}: {
  filters: OrganizerApplicationFiltersState;
  onChange: (next: OrganizerApplicationFiltersState) => void;
  divisionOptions: { id: string; label: string }[];
  gymOptions: { id: string; name: string }[];
}) {
  function patch<K extends keyof OrganizerApplicationFiltersState>(
    key: K,
    value: OrganizerApplicationFiltersState[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Card variant="default" className="py-4">
      <CardContent className="flex min-w-0 flex-col gap-3 px-4">
        <label className="flex w-full flex-col gap-1 text-xs">
          <span className="text-muted-foreground font-medium">선수 이름 검색</span>
          <input
            id="f-fighter"
            type="search"
            placeholder="선수 이름 검색"
            className={cn(
              selectClass,
              "h-11 w-full px-3 text-sm md:h-10 md:max-w-md",
            )}
            value={filters.fighterName}
            onChange={(e) => patch("fighterName", e.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">상태</span>
            <select
              id="f-app"
              className={cn(selectClass, "min-w-[8rem]")}
              value={filters.displayStatus}
              onChange={(e) =>
                patch(
                  "displayStatus",
                  e.target.value as OrganizerApplicationFiltersState["displayStatus"],
                )
              }
            >
              <option value="all">전체</option>
              <option value="pending">미승인</option>
              <option value="approved">승인</option>
              <option value="gym_cancelled">체육관취소</option>
              <option value="organizer_cancelled">주최측취소</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">입금 상태</span>
            <select
              id="f-pay"
              className={cn(selectClass, "min-w-[8rem]")}
              value={filters.paymentDisplay}
              onChange={(e) =>
                patch(
                  "paymentDisplay",
                  e.target.value as OrganizerApplicationFiltersState["paymentDisplay"],
                )
              }
            >
              <option value="all">전체</option>
              <option value="unpaid">미입금</option>
              <option value="paid">입금완료</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">{MATCH_CATEGORY_LABEL}</span>
            <select
              id="f-div"
              className={cn(selectClass, "min-w-[10rem]")}
              value={filters.divisionId}
              onChange={(e) => patch("divisionId", e.target.value)}
            >
              <option value="all">전체</option>
              {divisionOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">체육관</span>
            <select
              id="f-gym"
              className={cn(selectClass, "min-w-[10rem]")}
              value={filters.gymId}
              onChange={(e) => patch("gymId", e.target.value)}
            >
              <option value="all">전체</option>
              {gymOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">동의</span>
            <select
              id="f-consent"
              className={cn(selectClass, "min-w-[8rem]")}
              value={filters.consent}
              onChange={(e) => patch("consent", e.target.value)}
            >
              <option value="all">전체</option>
              <option value="not_required">동의 불필요</option>
              <option value="completed">완료</option>
              <option value="draft">작성중</option>
              <option value="missing">미작성</option>
              <option value="other">기타</option>
            </select>
          </label>
        </div>

        <p className="text-muted-foreground text-xs">
          체육관 필터 후 「전체 선택」으로 일괄 입금확인(승인)이 가능합니다.
        </p>
      </CardContent>
    </Card>
  );
}
