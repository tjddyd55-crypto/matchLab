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
  checkInSelectValueForFilter,
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
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
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [preferredApplicationId, setPreferredApplicationId] = useState<
    string | null
  >(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const gymOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.gymId, r.gymName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.divisionId, r.divisionLabel);
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesFieldStatusSearchQuery(r, searchQuery)) return false;
      if (gymFilter !== "all" && r.gymId !== gymFilter) return false;
      if (divisionFilter !== "all" && r.divisionId !== divisionFilter)
        return false;
      if (
        checkInFilter !== "all" &&
        checkInFilter !== "no_show_group" &&
        r.checkInStatus !== checkInFilter
      ) {
        return false;
      }
      if (checkInFilter === "no_show_group") {
        const inGroup =
          r.checkInStatus === "no_show" ||
          r.checkInStatus === "withdrawn" ||
          r.checkInStatus === "disqualified";
        if (!inGroup) return false;
      }
      if (!matchesFieldStatusSummaryFilter(r, summaryFilter)) return false;
      return true;
    });
  }, [rows, searchQuery, gymFilter, divisionFilter, checkInFilter, summaryFilter]);

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
    setCheckInFilter(checkInSelectValueForFilter(filter));
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleCheckInDropdown(value: string) {
    setCheckInFilter(value);
    if (value === "all") {
      setSummaryFilter("all");
      return;
    }
    if (value === "checked_in") setSummaryFilter("checked_in");
    else if (value === "pending") setSummaryFilter("pending");
    else if (value === "no_show_group") setSummaryFilter("no_show_group");
    else setSummaryFilter("all");
  }

  function resetFilters() {
    setSearchQuery("");
    setGymFilter("all");
    setDivisionFilter("all");
    setCheckInFilter("all");
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
    <div className="flex flex-col gap-6">
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
            className={cn(ORGANIZER_FIELD_INPUT_CLASS, compactApplicantSearchClass)}
          />
          <div className="grid grid-cols-2 gap-2.5 md:contents">
            <select
              className={cn(selectClass, compactApplicantSelectWidths.gym)}
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
              className={cn(selectClass, compactApplicantSelectWidths.division)}
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
              className={cn(selectClass, compactApplicantSelectWidths.checkIn)}
              value={checkInFilter}
              onChange={(e) => handleCheckInDropdown(e.target.value)}
              aria-label="현장 확인 필터"
            >
              <option value="all">현장확인 전체</option>
              <option value="pending">미확인</option>
              <option value="checked_in">현장 확인</option>
              <option value="no_show_group">미출석·철회·실격</option>
              <option value="no_show">미출석</option>
              <option value="withdrawn">철회</option>
              <option value="disqualified">실격</option>
            </select>
            <CompactFilterResetButton
              onClick={resetFilters}
              className="col-span-2 w-full md:col-span-1 md:w-auto"
            />
          </div>
        </div>
      </div>

      {/* PC master-detail */}
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

      {/* Mobile stack */}
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
