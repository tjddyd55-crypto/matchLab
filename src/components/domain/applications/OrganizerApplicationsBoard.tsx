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
  buildApplicantGymFilterOptions,
  groupApplicantsByGymDisplayName,
  matchesApplicantAssignmentFilter,
  normalizeApplicantGymDisplayName,
} from "@/lib/applications/applicant-list-filters";
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
  OrganizerApplicantExcelExportDialog,
  OrganizerApplicantExcelExportTrigger,
} from "@/components/domain/applications/OrganizerApplicantExcelExportDialog";
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
  gymName: "all",
  consent: "all",
  fighterName: "",
  assignment: "all",
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
  const [excelExportOpen, setExcelExportOpen] = useState(false);
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

  const gymOptions = useMemo(
    () => buildApplicantGymFilterOptions(rows),
    [rows],
  );

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
      if (
        filters.gymName !== "all" &&
        normalizeApplicantGymDisplayName(r.gymName) !== filters.gymName
      ) {
        return false;
      }
      if (filters.consent !== "all" && r.consentFilterKey !== filters.consent) {
        return false;
      }
      if (
        !matchesApplicantAssignmentFilter(
          r.assignmentCount ?? 0,
          filters.assignment,
        )
      ) {
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
    const gymNames = new Set<string>();
    let gymName: string | null = null;
    for (const r of filtered) {
      if (selectedIds.has(r.applicationId)) {
        if (r.gymId) gymIds.add(r.gymId);
        gymNames.add(normalizeApplicantGymDisplayName(r.gymName));
        gymName = normalizeApplicantGymDisplayName(r.gymName);
      }
    }
    if (gymNames.size !== 1) return { gymId: null, gymName: null };
    const uniqueGymId = gymIds.size === 1 ? ([...gymIds][0] ?? null) : null;
    return { gymId: uniqueGymId, gymName };
  }, [filtered, selectedIds]);

  const groupedRows = useMemo(() => {
    if (!groupByGym) return null;
    return groupApplicantsByGymDisplayName(filtered);
  }, [filtered, groupByGym]);

  const sportGroups = useMemo(() => {
    if (groupByGym) return null;
    return groupItemsByDivisionSport(filtered, (r) => r.division);
  }, [filtered, groupByGym]);

  const singleSportTitle = useMemo(
    () => resolveSingleSportSectionTitle(filtered.map((r) => r.division)),
    [filtered],
  );

  const hasActiveFilters =
    filters.fighterName.trim() ||
    filters.displayStatus !== "all" ||
    filters.paymentDisplay !== "all" ||
    filters.divisionId !== "all" ||
    filters.gymName !== "all" ||
    filters.consent !== "all" ||
    filters.assignment !== "all";

  const emptyMessage =
    rows.length === 0
      ? "아직 신청자가 없습니다."
      : hasActiveFilters
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

  function selectAllInGym(gymName: string) {
    const target = normalizeApplicantGymDisplayName(gymName);
    const ids = filtered
      .filter(
        (r) => normalizeApplicantGymDisplayName(r.gymName) === target,
      )
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
    manualRegistrationOptions,
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
                setExcelExportOpen(false);
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
                setExcelExportOpen(false);
              }
            }}
          />
          <OrganizerApplicantExcelTrigger
            onOpen={() => {
              setExcelOpen(true);
              setExcelExportOpen(false);
              setManualOpen(false);
              setLinkOpen(false);
            }}
          />
          <OrganizerApplicantExcelExportTrigger
            onOpen={() => {
              setExcelExportOpen(true);
              setExcelOpen(false);
              setManualOpen(false);
              setLinkOpen(false);
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9"
            variant={groupByGym ? "default" : "outline"}
            aria-pressed={groupByGym}
            onClick={() => setGroupByGym((v) => !v)}
          >
            {groupByGym ? "체육관별 그룹 보기 중" : "체육관별 그룹 보기"}
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
      <OrganizerApplicantExcelExportDialog
        open={excelExportOpen}
        onOpenChange={setExcelExportOpen}
        eventId={eventId}
        filteredApplicationIds={filtered.map((r) => r.applicationId)}
        filteredCount={filtered.length}
        totalCount={rows.length}
        hasActiveFilters={Boolean(hasActiveFilters)}
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
      {filters.gymName !== "all" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9"
            variant="outline"
            onClick={() => selectAllInGym(filters.gymName)}
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
                  <section
                    key={group.gymName}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {group.gymName}
                        <span className="text-matchon-text-secondary ml-2 text-xs font-normal">
                          {group.rows.length}명
                        </span>
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8"
                        variant="outline"
                        onClick={() => selectAllInGym(group.gymName)}
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
        selectedGymName={filters.gymName === "all" ? null : filters.gymName}
        onSelectGym={(gymName) =>
          setFilters((prev) => ({ ...prev, gymName: gymName ?? "all" }))
        }
      />
    </div>
  );
}
