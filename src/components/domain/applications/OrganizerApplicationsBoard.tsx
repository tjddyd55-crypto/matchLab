"use client";

import { useMemo, useState } from "react";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { OrganizerApplicationsBulkToolbar } from "@/components/domain/applications/OrganizerApplicationsBulkToolbar";
import { OrganizerApplicationsCards } from "@/components/domain/applications/OrganizerApplicationsCards";
import { OrganizerApplicationsList } from "@/components/domain/applications/OrganizerApplicationsList";
import {
  OrganizerApplicationsFilterBar,
  type OrganizerApplicationFiltersState,
} from "@/components/domain/applications/OrganizerApplicationsFilterBar";
import { OrganizerApplicationsTable } from "@/components/domain/applications/OrganizerApplicationsTable";
import { resolveOrganizerApplicationDisplayStatus } from "@/lib/application-display-status";
import { isPaidForOrganizerDisplay } from "@/lib/application-display-status";
import { OrganizerApplicationsGymSummaryTable } from "@/components/domain/applications/OrganizerApplicationsGymSummaryTable";
import { OrganizerManualApplicationPanel } from "@/components/domain/applications/OrganizerManualApplicationPanel";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
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
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  manualRegistrationOptions: OrganizerManualRegistrationOptionsDTO;
}) {
  const [filters, setFilters] =
    useState<OrganizerApplicationFiltersState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupByGym, setGroupByGym] = useState(false);

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
      if (filters.paymentDisplay === "paid" && !isPaidForOrganizerDisplay(r.paymentStatus)) {
        return false;
      }
      if (filters.paymentDisplay === "unpaid" && isPaidForOrganizerDisplay(r.paymentStatus)) {
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
      if (nameQuery && !r.fighterName.toLowerCase().includes(nameQuery)) {
        return false;
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
    const map = new Map<string, { gymName: string; rows: OrganizerApplicationRowVM[] }>();
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

  function toggleSelect(applicationId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(applicationId);
      else next.delete(applicationId);
      return next;
    });
  }

  function selectAllInGym(gymId: string) {
    const ids = filtered.filter((r) => r.gymId === gymId).map((r) => r.applicationId);
    setSelectedIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const listProps = {
    eventId,
    selectedIds,
    onToggleSelect: toggleSelect,
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <OrganizerManualApplicationPanel
        eventId={eventId}
        options={manualRegistrationOptions}
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

      {groupByGym && groupedRows
        ? groupedRows.map((group) => (
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
              <OrganizerApplicationsTable rows={group.rows} {...listProps} />
              <OrganizerApplicationsList rows={group.rows} {...listProps} />
              <OrganizerApplicationsCards rows={group.rows} {...listProps} />
            </section>
          ))
        : null}

      {!groupByGym ? (
        <>
          <OrganizerApplicationsTable rows={filtered} {...listProps} />
          <OrganizerApplicationsList rows={filtered} {...listProps} />
          <OrganizerApplicationsCards rows={filtered} {...listProps} />
        </>
      ) : null}

    </div>
  );
}
