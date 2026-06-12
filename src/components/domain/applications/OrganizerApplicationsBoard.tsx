"use client";

import { useMemo, useState } from "react";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { OrganizerApplicationDetailDrawer } from "@/components/domain/applications/OrganizerApplicationDetailDrawer";
import { OrganizerApplicationsCards } from "@/components/domain/applications/OrganizerApplicationsCards";
import {
  OrganizerApplicationsFilterBar,
  type OrganizerApplicationFiltersState,
} from "@/components/domain/applications/OrganizerApplicationsFilterBar";
import { OrganizerApplicationsTable } from "@/components/domain/applications/OrganizerApplicationsTable";

const DEFAULT_FILTERS: OrganizerApplicationFiltersState = {
  applicationStatus: "all",
  paymentStatus: "all",
  divisionId: "all",
  gymId: "all",
  consent: "all",
};

export function OrganizerApplicationsBoard({
  eventId,
  rows,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
}) {
  const [filters, setFilters] =
    useState<OrganizerApplicationFiltersState>(DEFAULT_FILTERS);
  const [detailRow, setDetailRow] =
    useState<OrganizerApplicationRowVM | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      map.set(r.gymId, r.gymName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        filters.applicationStatus !== "all" &&
        r.applicationStatus !== filters.applicationStatus
      ) {
        return false;
      }
      if (
        filters.paymentStatus !== "all" &&
        r.paymentStatus !== filters.paymentStatus
      ) {
        return false;
      }
      if (filters.divisionId !== "all" && r.divisionId !== filters.divisionId) {
        return false;
      }
      if (filters.gymId !== "all" && r.gymId !== filters.gymId) {
        return false;
      }
      if (
        filters.consent !== "all" &&
        r.consentFilterKey !== filters.consent
      ) {
        return false;
      }
      return true;
    });
  }, [rows, filters]);

  function openDetail(row: OrganizerApplicationRowVM) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <OrganizerApplicationsFilterBar
        filters={filters}
        onChange={setFilters}
        divisionOptions={divisionOptions}
        gymOptions={gymOptions}
      />
      <OrganizerApplicationsTable rows={filtered} onOpenDetail={openDetail} />
      <OrganizerApplicationsCards rows={filtered} onOpenDetail={openDetail} />
      <OrganizerApplicationDetailDrawer
        eventId={eventId}
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
