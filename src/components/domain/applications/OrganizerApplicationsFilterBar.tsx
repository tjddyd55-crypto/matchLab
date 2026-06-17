"use client";

import type { OrganizerApplicationDisplayStatus } from "@/lib/application-display-status";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

export type OrganizerApplicationFiltersState = {
  displayStatus: OrganizerApplicationDisplayStatus | "all";
  paymentDisplay: "all" | "unpaid" | "paid";
  divisionId: string;
  gymId: string;
  consent: string;
  fighterName: string;
};

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
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-primary/20 bg-muted/20 p-4 text-sm md:flex-row md:flex-wrap md:items-end">
      <div className="grid min-w-[12rem] flex-1 gap-1 md:min-w-[16rem]">
        <label className="text-muted-foreground text-xs" htmlFor="f-fighter">
          선수이름 검색
        </label>
        <input
          id="f-fighter"
          type="search"
          placeholder="선수 이름"
          className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
          value={filters.fighterName}
          onChange={(e) => patch("fighterName", e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-app">
          상태
        </label>
        <select
          id="f-app"
          className="border-input bg-background h-9 min-w-0 w-full max-w-full rounded-lg border px-2 text-sm sm:min-w-[140px] sm:w-auto"
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
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-pay">
          입금 상태
        </label>
        <select
          id="f-pay"
          className="border-input bg-background h-9 min-w-0 w-full max-w-full rounded-lg border px-2 text-sm sm:min-w-[140px] sm:w-auto"
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
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-div">
          {MATCH_CATEGORY_LABEL}
        </label>
        <select
          id="f-div"
          className="border-input bg-background h-9 min-w-0 w-full max-w-full rounded-lg border px-2 text-sm sm:min-w-[160px] sm:w-auto"
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
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-gym">
          체육관
        </label>
        <select
          id="f-gym"
          className="border-input bg-background h-9 min-w-0 w-full max-w-full rounded-lg border px-2 text-sm sm:min-w-[160px] sm:w-auto"
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
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-consent">
          동의
        </label>
        <select
          id="f-consent"
          className="border-input bg-background h-9 min-w-0 w-full max-w-full rounded-lg border px-2 text-sm sm:min-w-[140px] sm:w-auto"
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
      </div>
      <p className="text-muted-foreground text-xs md:flex-1 md:text-right">
        체육관 필터 후 「전체 선택」으로 일괄 입금확인(승인)이 가능합니다.
      </p>
    </div>
  );
}
