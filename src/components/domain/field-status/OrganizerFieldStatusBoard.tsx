"use client";

import { useMemo, useRef, useState } from "react";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { FieldStatusSummaryCards } from "@/components/domain/field-status/FieldStatusSummaryCards";
import { OrganizerFieldStatusDetailPane } from "@/components/domain/field-status/OrganizerFieldStatusDetailPane";
import { OrganizerFieldStatusListPane } from "@/components/domain/field-status/OrganizerFieldStatusListPane";
import { DivisionSportSectionHeader } from "@/components/domain/shared/DivisionSportSectionHeader";
import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";
import {
  groupItemsByDivisionSport,
  resolveSingleSportSectionTitle,
} from "@/lib/division-sport-grouping";
import {
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
  weighInSelectValueForFilter,
  type FieldStatusSummaryFilter,
} from "@/components/domain/field-status/field-status-filters";
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
import {
  organizerOperationDetailPaneClass,
  organizerOperationListPaneClass,
  organizerOperationListScrollClass,
  organizerOperationWorkspaceClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

export function OrganizerFieldStatusBoard({
  rows,
  summary,
  eventId,
}: {
  rows: FieldStatusRowDTO[];
  summary: FieldStatusSummaryDTO;
  eventId: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gymFilter, setGymFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [summaryFilter, setSummaryFilter] =
    useState<FieldStatusSummaryFilter>("all");
  const [weighInFilter, setWeighInFilter] = useState("all");
  const [preferredApplicationId, setPreferredApplicationId] = useState<
    string | null
  >(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const gymOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const key = r.gymId ?? `name:${r.gymName}`;
      map.set(key, r.gymName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.divisionId ?? "", r.divisionLabel);
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesFieldStatusSearchQuery(r, searchQuery)) return false;
      if (gymFilter !== "all" && r.gymId !== gymFilter) return false;
      if (divisionFilter !== "all" && r.divisionId !== divisionFilter) {
        return false;
      }
      if (weighInFilter === "pending") {
        if (r.weighInStatus !== "pending") return false;
      } else if (weighInFilter === "pass") {
        if (r.weighInStatus !== "pass" && r.weighInStatus !== "manual_pass") {
          return false;
        }
      } else if (weighInFilter === "fail") {
        if (r.weighInStatus !== "fail" && r.weighInStatus !== "manual_fail") {
          return false;
        }
      }
      if (!matchesFieldStatusSummaryFilter(r, summaryFilter)) return false;
      return true;
    });
  }, [
    rows,
    searchQuery,
    gymFilter,
    divisionFilter,
    weighInFilter,
    summaryFilter,
  ]);

  const selectedApplicationId = useMemo(() => {
    if (filtered.length === 0) return null;
    if (
      preferredApplicationId &&
      filtered.some((r) => r.applicationId === preferredApplicationId)
    ) {
      return preferredApplicationId;
    }
    return filtered[0]!.applicationId;
  }, [filtered, preferredApplicationId]);

  const sportGroups = useMemo(
    () => groupItemsByDivisionSport(filtered, (r) => r.division),
    [filtered],
  );

  const singleSportTitle = useMemo(
    () => resolveSingleSportSectionTitle(filtered.map((r) => r.division)),
    [filtered],
  );

  const showSportSections = sportGroups.length > 1;

  const selectedRow =
    filtered.find((r) => r.applicationId === selectedApplicationId) ?? null;

  const selectClass = ORGANIZER_FIELD_SELECT_CLASS;

  function handleSummaryFilterChange(filter: FieldStatusSummaryFilter) {
    setSummaryFilter(filter);
    setWeighInFilter(weighInSelectValueForFilter(filter));
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleWeighInDropdown(value: string) {
    setWeighInFilter(value);
    if (value === "all") {
      setSummaryFilter("all");
      return;
    }
    if (value === "pending") setSummaryFilter("weigh_pending");
    else if (value === "pass") setSummaryFilter("weigh_in_pass");
    else if (value === "fail") setSummaryFilter("weigh_in_fail");
    else setSummaryFilter("all");
  }

  function resetFilters() {
    setSearchQuery("");
    setGymFilter("all");
    setDivisionFilter("all");
    setWeighInFilter("all");
    setSummaryFilter("all");
  }

  function handleSelect(applicationId: string) {
    setPreferredApplicationId(applicationId);
    setMobileShowDetail(true);
  }

  let sequenceOffset = 0;

  const listContent = showSportSections ? (
    sportGroups.map((group) => {
      const start = sequenceOffset;
      sequenceOffset += group.items.length;
      return (
        <section key={group.sportTitle} className="flex flex-col gap-2">
          <DivisionSportSectionHeader title={group.sportTitle} />
          <OrganizerFieldStatusListPane
            rows={group.items}
            sequenceStart={start}
            selectedApplicationId={selectedApplicationId}
            onSelect={handleSelect}
          />
        </section>
      );
    })
  ) : (
    <>
      {singleSportTitle ? (
        <DivisionSportSectionHeader
          title={singleSportTitle}
          className="mb-1"
        />
      ) : null}
      <OrganizerFieldStatusListPane
        rows={filtered}
        sequenceStart={0}
        selectedApplicationId={selectedApplicationId}
        onSelect={handleSelect}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-3 md:gap-3.5">
      <FieldStatusSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <div className={compactApplicantFilterBarClass}>
        <div className={compactApplicantFilterRowClass}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="선수명·체육관·경기구분·체급 검색"
            aria-label="선수 검색"
            className={cn(
              ORGANIZER_FIELD_INPUT_CLASS,
              compactApplicantSearchClass,
              "h-9 min-h-9",
            )}
          />
          <div className="grid grid-cols-2 gap-2.5 md:contents">
            <select
              className={cn(
                selectClass,
                compactApplicantSelectWidths.gym,
                "h-9 min-h-9",
              )}
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
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
              className={cn(
                selectClass,
                compactApplicantSelectWidths.division,
                "h-9 min-h-9",
              )}
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
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
              className={cn(
                selectClass,
                compactApplicantSelectWidths.status,
                "h-9 min-h-9",
              )}
              value={weighInFilter}
              onChange={(e) => handleWeighInDropdown(e.target.value)}
              aria-label="계체 상태 필터"
            >
              <option value="all">계체상태 전체</option>
              <option value="pending">계체 대기</option>
              <option value="pass">계체 통과</option>
              <option value="fail">계체 실패</option>
            </select>
            <CompactFilterResetButton
              onClick={resetFilters}
              className="col-span-2 w-full md:col-span-1 md:w-auto"
            />
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        className={cn(organizerOperationWorkspaceClass, "hidden md:grid")}
      >
        <div className={organizerOperationListPaneClass}>
          <div className={organizerOperationListScrollClass}>{listContent}</div>
        </div>
        <div className={organizerOperationDetailPaneClass}>
          {selectedRow ? (
            <OrganizerFieldStatusDetailPane
              key={selectedRow.applicationId}
              row={selectedRow}
              eventId={eventId}
            />
          ) : (
            <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
              선수를 선택하면 상세·조치를 처리할 수 있습니다.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {mobileShowDetail && selectedRow ? (
          <OrganizerFieldStatusDetailPane
            key={selectedRow.applicationId}
            row={selectedRow}
            eventId={eventId}
            onBack={() => setMobileShowDetail(false)}
          />
        ) : (
          listContent
        )}
      </div>
    </div>
  );
}
