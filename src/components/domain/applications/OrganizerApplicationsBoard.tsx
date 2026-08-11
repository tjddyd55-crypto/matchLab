"use client";

import { useMemo, useRef, useState } from "react";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { OrganizerApplicationsBulkToolbar } from "@/components/domain/applications/OrganizerApplicationsBulkToolbar";
import { OrganizerApplicationsCards } from "@/components/domain/applications/OrganizerApplicationsCards";
import { OrganizerApplicationsList } from "@/components/domain/applications/OrganizerApplicationsList";
import {
  OrganizerApplicationsFilterBar,
  type OrganizerApplicationFiltersState,
} from "@/components/domain/applications/OrganizerApplicationsFilterBar";
import { OrganizerApplicationsTable } from "@/components/domain/applications/OrganizerApplicationsTable";
import { OrganizerApplicationsSummaryCards } from "@/components/domain/applications/OrganizerApplicationsSummaryCards";
import { DivisionSportSectionHeader } from "@/components/domain/shared/DivisionSportSectionHeader";
import {
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import {
  groupItemsByDivisionSport,
  resolveSingleSportSectionTitle,
} from "@/lib/division-sport-grouping";
import { OrganizerApplicationsGymSummaryTable } from "@/components/domain/applications/OrganizerApplicationsGymSummaryTable";
import { OrganizerManualApplicationPanel } from "@/components/domain/applications/OrganizerManualApplicationPanel";
import { ExternalRegistrationLinkPanel } from "@/components/domain/applications/ExternalRegistrationLinkPanel";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
import type { ExternalRegistrationLinkVM } from "@/lib/services/external-registration-link.service";
import {
  inferSummaryFilter,
  summaryFilterToFilters,
  type OrganizerApplicationSummaryFilter,
} from "@/components/domain/applications/organizer-application-filters";
import { Button } from "@/components/ui/button";

const DEFAULT_FILTERS: OrganizerApplicationFiltersState = {
  displayStatus: "all",
  paymentDisplay: "all",
  divisionId: "all",
  gymId: "all",
  consent: "all",
  fighterName: "",
};

export function OrganizerApplicationsBoard({
  eventId,
  rows,
  manualRegistrationOptions,
  externalRegistrationLink,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  manualRegistrationOptions: OrganizerManualRegistrationOptionsDTO;
  externalRegistrationLink: ExternalRegistrationLinkVM | null;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] =
    useState<OrganizerApplicationFiltersState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupByGym, setGroupByGym] = useState(false);

  const summaryFilter = useMemo(() => inferSummaryFilter(filters), [filters]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.divisionId, r.divisionLabel);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const gymOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.gymId) map.set(r.gymId, r.gymName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const display = resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      });
      if (filters.displayStatus !== "all" && display !== filters.displayStatus) {
        return false;
      }
      if (
        filters.paymentDisplay === "paid" &&
        !isPaidForOrganizerDisplay(r.paymentStatus)
      ) {
        return false;
      }
      if (
        filters.paymentDisplay === "unpaid" &&
        isPaidForOrganizerDisplay(r.paymentStatus)
      ) {
        return false;
      }
      if (filters.divisionId !== "all" && r.divisionId !== filters.divisionId) {
        return false;
      }
      if (filters.gymId !== "all" && r.gymId !== filters.gymId) {
        return false;
      }
      if (filters.consent !== "all" && r.consentFilterKey !== filters.consent) {
        return false;
      }
      const nameQuery = filters.fighterName.trim().toLowerCase();
      if (nameQuery) {
        const haystack = [r.fighterName, r.gymName, r.divisionLabel]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(nameQuery)) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const selectedGym = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const gymIds = new Set<string>();
    let gymName: string | null = null;
    for (const r of filtered) {
      if (selectedIds.has(r.applicationId)) {
        gymIds.add(r.gymId);
        gymName = r.gymName;
      }
    }
    if (gymIds.size !== 1) return { gymId: null, gymName: null };
    return { gymId: [...gymIds][0] ?? null, gymName };
  }, [filtered, selectedIds]);

  const groupedRows = useMemo(() => {
    if (!groupByGym) return null;
    const map = new Map<
      string,
      { gymName: string; rows: OrganizerApplicationRowVM[] }
    >();
    for (const r of filtered) {
      const key = r.gymId || "_unknown";
      const entry = map.get(key) ?? { gymName: r.gymName, rows: [] };
      entry.rows.push(r);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.gymName.localeCompare(b.gymName, "ko"),
    );
  }, [filtered, groupByGym]);

  const sportGroups = useMemo(() => {
    if (groupByGym) return null;
    return groupItemsByDivisionSport(filtered, (r) => r.division);
  }, [filtered, groupByGym]);

  const singleSportTitle = useMemo(
    () => resolveSingleSportSectionTitle(filtered.map((r) => r.division)),
    [filtered],
  );

  const emptyMessage =
    rows.length === 0
      ? "아직 신청자가 없습니다."
      : filters.fighterName.trim() ||
          filters.displayStatus !== "all" ||
          filters.paymentDisplay !== "all" ||
          filters.divisionId !== "all" ||
          filters.gymId !== "all" ||
          filters.consent !== "all"
        ? "조건에 맞는 신청자가 없습니다."
        : "아직 신청자가 없습니다.";

  function toggleSelect(applicationId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(applicationId);
      else next.delete(applicationId);
      return next;
    });
  }

  function selectAllInGym(gymId: string) {
    const ids = filtered
      .filter((r) => r.gymId === gymId)
      .map((r) => r.applicationId);
    setSelectedIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleSummaryFilterChange(filter: OrganizerApplicationSummaryFilter) {
    const patch = summaryFilterToFilters(filter);
    setFilters((prev) => ({ ...prev, ...patch }));
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const listProps = {
    eventId,
    selectedIds,
    onToggleSelect: toggleSelect,
    emptyMessage,
  };

  function renderApplicationViews(
    applicationRows: OrganizerApplicationRowVM[],
    sequenceStart: number,
  ) {
    return (
      <>
        <OrganizerApplicationsTable
          rows={applicationRows}
          sequenceStart={sequenceStart}
          {...listProps}
        />
        <OrganizerApplicationsList
          rows={applicationRows}
          sequenceStart={sequenceStart}
          {...listProps}
        />
        <OrganizerApplicationsCards
          rows={applicationRows}
          sequenceStart={sequenceStart}
          {...listProps}
        />
      </>
    );
  }

  let sequenceOffset = 0;

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <OrganizerManualApplicationPanel
        eventId={eventId}
        options={manualRegistrationOptions}
      />
      <ExternalRegistrationLinkPanel
        eventId={eventId}
        initialLink={externalRegistrationLink}
      />

      <OrganizerApplicationsSummaryCards
        rows={rows}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <OrganizerApplicationsGymSummaryTable
        rows={rows}
        selectedGymId={filters.gymId === "all" ? null : filters.gymId}
        onSelectGym={(gymId) =>
          setFilters((prev) => ({ ...prev, gymId: gymId ?? "all" }))
        }
      />

      <OrganizerApplicationsFilterBar
        filters={filters}
        onChange={setFilters}
        divisionOptions={divisionOptions}
        gymOptions={gymOptions}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={groupByGym ? "default" : "outline"}
          onClick={() => setGroupByGym((v) => !v)}
        >
          체육관별 그룹 보기
        </Button>
        {filters.gymId !== "all" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => selectAllInGym(filters.gymId)}
          >
            필터된 체육관 전체 선택
          </Button>
        ) : null}
      </div>

      <OrganizerApplicationsBulkToolbar
        eventId={eventId}
        gymId={selectedGym?.gymId ?? null}
        gymName={selectedGym?.gymName ?? null}
        selectedIds={[...selectedIds]}
        onClearSelection={clearSelection}
      />

      {groupByGym && singleSportTitle ? (
        <DivisionSportSectionHeader title={singleSportTitle} className="mb-1" />
      ) : null}

      <div ref={listRef} className="min-w-0 flex flex-col gap-6">
        {groupByGym && groupedRows
          ? groupedRows.length > 0
            ? groupedRows.map((group) => {
                const start = sequenceOffset;
                sequenceOffset += group.rows.length;
                return (
                  <section key={group.gymName} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{group.gymName}</h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const gymId = group.rows[0]?.gymId;
                          if (gymId) selectAllInGym(gymId);
                        }}
                      >
                        이 체육관 전체 선택
                      </Button>
                    </div>
                    {renderApplicationViews(group.rows, start)}
                  </section>
                );
              })
            : renderApplicationViews(filtered, 0)
          : null}

        {!groupByGym && sportGroups
          ? sportGroups.length > 0
            ? sportGroups.map((group) => {
                const start = sequenceOffset;
                sequenceOffset += group.items.length;
                return (
                  <section key={group.sportTitle} className="flex flex-col gap-3">
                    <DivisionSportSectionHeader title={group.sportTitle} />
                    {renderApplicationViews(group.items, start)}
                  </section>
                );
              })
            : renderApplicationViews(filtered, 0)
          : null}
      </div>
    </div>
  );
}
