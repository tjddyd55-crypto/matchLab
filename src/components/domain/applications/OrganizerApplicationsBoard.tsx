"use client";

import { useMemo, useRef, useState } from "react";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { OrganizerApplicationsBulkToolbar } from "@/components/domain/applications/OrganizerApplicationsBulkToolbar";
import { OrganizerAdditionalInfoBulkDialog } from "@/components/domain/applications/OrganizerAdditionalInfoBulkDialog";
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
import {
  OrganizerManualApplicationPanel,
  OrganizerManualApplicationTrigger,
} from "@/components/domain/applications/OrganizerManualApplicationPanel";
import {
  OrganizerApplicantExcelImportDialog,
  OrganizerApplicantExcelTrigger,
} from "@/components/domain/applications/OrganizerApplicantExcelImportDialog";
import {
  ExternalRegistrationLinkPanel,
  ExternalRegistrationLinkTrigger,
} from "@/components/domain/applications/ExternalRegistrationLinkPanel";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
import type { ExternalRegistrationLinkVM } from "@/lib/services/external-registration-link.service";
import {
  inferSummaryFilter,
  summaryFilterToFilters,
  type OrganizerApplicationSummaryFilter,
} from "@/components/domain/applications/organizer-application-filters";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
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
  const [manualOpen, setManualOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [externalLink, setExternalLink] = useState(externalRegistrationLink);
  const [additionalInfoBulkOpen, setAdditionalInfoBulkOpen] = useState(false);

  const summaryFilter = useMemo(() => inferSummaryFilter(filters), [filters]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const key = r.divisionId ?? "__other__";
      map.set(key, r.divisionLabel);
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
      if (
        filters.divisionId !== "all" &&
        (r.divisionId ?? "__other__") !== filters.divisionId
      ) {
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

  const emptyDescription =
    rows.length === 0
      ? "등록 링크·선수 직접 등록·엑셀로 1차 신청자를 추가할 수 있습니다."
      : undefined;

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
    emptyDescription,
    divisions: manualRegistrationOptions.divisions.map((d) => ({
      id: d.id,
      label: d.label,
      gender: d.gender,
      ageGroup: d.ageGroup,
      weightClass: d.weightClass,
      weightClassName: d.weightClassName,
      weightLimitText: d.weightLimitText,
    })),
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
    <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden md:gap-3.5">
      <EventManagementPageHeader
        title="신청자 관리"
        description="신청자 및 입금 상태를 관리합니다."
        className="gap-2 sm:items-center"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ExternalRegistrationLinkTrigger
            eventId={eventId}
            link={externalLink}
            open={linkOpen}
            onOpenChange={(next) => {
              setLinkOpen(next);
              if (next) {
                setManualOpen(false);
                setExcelOpen(false);
              }
            }}
            onLinkChange={setExternalLink}
          />
          <OrganizerManualApplicationTrigger
            open={manualOpen}
            onOpenChange={(next) => {
              setManualOpen(next);
              if (next) {
                setLinkOpen(false);
                setExcelOpen(false);
              }
            }}
          />
          <OrganizerApplicantExcelTrigger
            onOpen={() => {
              setExcelOpen(true);
              setManualOpen(false);
              setLinkOpen(false);
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9"
            variant="outline"
            onClick={() => setGroupByGym((v) => !v)}
          >
            체육관별 그룹 보기
          </Button>
        </div>
      </EventManagementPageHeader>

      <ExternalRegistrationLinkPanel
        eventId={eventId}
        link={externalLink}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onLinkChange={setExternalLink}
      />
      <OrganizerManualApplicationPanel
        eventId={eventId}
        options={manualRegistrationOptions}
        open={manualOpen}
        onOpenChange={setManualOpen}
      />
      <OrganizerApplicantExcelImportDialog
        eventId={eventId}
        open={excelOpen}
        onOpenChange={setExcelOpen}
      />

      <OrganizerApplicationsSummaryCards
        rows={rows}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <OrganizerApplicationsFilterBar
        filters={filters}
        onChange={setFilters}
        divisionOptions={divisionOptions}
        gymOptions={gymOptions}
      />
      {filters.gymId !== "all" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9"
            variant="outline"
            onClick={() => selectAllInGym(filters.gymId)}
          >
            필터된 체육관 전체 선택
          </Button>
        </div>
      ) : null}

      <OrganizerApplicationsBulkToolbar
        eventId={eventId}
        gymId={selectedGym?.gymId ?? null}
        gymName={selectedGym?.gymName ?? null}
        selectedIds={[...selectedIds]}
        onClearSelection={clearSelection}
        onRequestAdditionalInfo={() => setAdditionalInfoBulkOpen(true)}
      />

      <OrganizerAdditionalInfoBulkDialog
        eventId={eventId}
        rows={rows}
        selectedIds={[...selectedIds]}
        open={additionalInfoBulkOpen}
        onOpenChange={setAdditionalInfoBulkOpen}
      />

      {groupByGym && singleSportTitle ? (
        <DivisionSportSectionHeader title={singleSportTitle} className="mb-0" />
      ) : null}

      <div ref={listRef} className="min-w-0 flex flex-col gap-4">
        {groupByGym && groupedRows
          ? groupedRows.length > 0
            ? groupedRows.map((group) => {
                const start = sequenceOffset;
                sequenceOffset += group.rows.length;
                return (
                  <section key={group.gymName} className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{group.gymName}</h3>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8"
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
                const showSportHeader = sportGroups.length > 1;
                return (
                  <section
                    key={group.sportTitle}
                    className="flex flex-col gap-2.5"
                  >
                    {showSportHeader ? (
                      <DivisionSportSectionHeader title={group.sportTitle} />
                    ) : null}
                    {renderApplicationViews(group.items, start)}
                  </section>
                );
              })
            : renderApplicationViews(filtered, 0)
          : null}
      </div>

      <OrganizerApplicationsGymSummaryTable
        rows={rows}
        selectedGymId={filters.gymId === "all" ? null : filters.gymId}
        onSelectGym={(gymId) =>
          setFilters((prev) => ({ ...prev, gymId: gymId ?? "all" }))
        }
      />
    </div>
  );
}
