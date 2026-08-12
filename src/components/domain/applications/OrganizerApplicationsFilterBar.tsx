"use client";

import type { OrganizerApplicationDisplayStatus } from "@/lib/application-display-status";
import {
  CompactFilterResetButton,
  compactApplicantFilterBarClass,
  compactApplicantFilterRowClass,
  compactApplicantSearchClass,
  compactApplicantSelectWidths,
} from "@/components/domain/shared/CompactApplicantFilterBar";
import {
  ORGANIZER_FIELD_INPUT_CLASS,
  ORGANIZER_FIELD_SELECT_CLASS,
} from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

export type OrganizerApplicationFiltersState = {
  displayStatus: OrganizerApplicationDisplayStatus | "all";
  paymentDisplay: "all" | "unpaid" | "paid";
  divisionId: string;
  gymId: string;
  consent: string;
  fighterName: string;
};

const DEFAULT_FILTERS: OrganizerApplicationFiltersState = {
  displayStatus: "all",
  paymentDisplay: "all",
  divisionId: "all",
  gymId: "all",
  consent: "all",
  fighterName: "",
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

  function reset() {
    onChange({ ...DEFAULT_FILTERS });
  }

  return (
    <div className={compactApplicantFilterBarClass}>
      <div className={compactApplicantFilterRowClass}>
        <input
          id="f-fighter"
          type="search"
          placeholder="선수명·체육관·경기구분·체급 검색"
          aria-label="선수 검색"
          className={cn(ORGANIZER_FIELD_INPUT_CLASS, compactApplicantSearchClass)}
          value={filters.fighterName}
          onChange={(e) => patch("fighterName", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2.5 md:contents">
          <select
            id="f-gym"
            className={cn(
              ORGANIZER_FIELD_SELECT_CLASS,
              compactApplicantSelectWidths.gym,
            )}
            value={filters.gymId}
            onChange={(e) => patch("gymId", e.target.value)}
            aria-label="체육관 필터"
          >
            <option value="all">체육관 전체</option>
            {gymOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            id="f-div"
            className={cn(
              ORGANIZER_FIELD_SELECT_CLASS,
              compactApplicantSelectWidths.division,
            )}
            value={filters.divisionId}
            onChange={(e) => patch("divisionId", e.target.value)}
            aria-label="경기구분 필터"
          >
            <option value="all">경기구분 전체</option>
            {divisionOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            id="f-app"
            className={cn(
              ORGANIZER_FIELD_SELECT_CLASS,
              compactApplicantSelectWidths.status,
            )}
            value={filters.displayStatus}
            onChange={(e) =>
              patch(
                "displayStatus",
                e.target.value as OrganizerApplicationFiltersState["displayStatus"],
              )
            }
            aria-label="신청상태 필터"
          >
            <option value="all">신청상태 전체</option>
            <option value="pending">미승인</option>
            <option value="approved">승인</option>
            <option value="gym_cancelled">체육관취소</option>
            <option value="organizer_cancelled">주최측취소</option>
          </select>
          <select
            id="f-pay"
            className={cn(
              ORGANIZER_FIELD_SELECT_CLASS,
              compactApplicantSelectWidths.payment,
            )}
            value={filters.paymentDisplay}
            onChange={(e) =>
              patch(
                "paymentDisplay",
                e.target.value as OrganizerApplicationFiltersState["paymentDisplay"],
              )
            }
            aria-label="입금 상태 필터"
          >
            <option value="all">입금 전체</option>
            <option value="unpaid">미입금</option>
            <option value="paid">입금완료</option>
          </select>
          <select
            id="f-consent"
            className={cn(
              ORGANIZER_FIELD_SELECT_CLASS,
              compactApplicantSelectWidths.consent,
            )}
            value={filters.consent}
            onChange={(e) => patch("consent", e.target.value)}
            aria-label="동의 필터"
          >
            <option value="all">동의 전체</option>
            <option value="not_required">동의 불필요</option>
            <option value="completed">완료</option>
            <option value="draft">작성중</option>
            <option value="missing">미작성</option>
            <option value="other">기타</option>
          </select>
          <CompactFilterResetButton
            onClick={reset}
            className="col-span-2 w-full md:col-span-1 md:w-auto"
          />
        </div>
      </div>
      <p className="text-matchon-text-secondary mt-1.5 text-[11px] leading-snug md:mt-2">
        체육관 필터 후 「전체 선택」으로 일괄 입금확인(승인)이 가능합니다.
      </p>
    </div>
  );
}
