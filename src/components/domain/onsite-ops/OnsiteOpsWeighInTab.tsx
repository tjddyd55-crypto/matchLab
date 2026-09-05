"use client";

import { useMemo, useState } from "react";
import { OrganizerFieldStatusDetailPane } from "@/components/domain/field-status/OrganizerFieldStatusDetailPane";
import { OrganizerFieldStatusListPane } from "@/components/domain/field-status/OrganizerFieldStatusListPane";
import { FieldStatusSummaryCards } from "@/components/domain/field-status/FieldStatusSummaryCards";
import {
  matchesFieldStatusGymFilter,
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
  type FieldStatusSummaryFilter,
} from "@/components/domain/field-status/field-status-filters";
import {
  buildApplicantGymFilterOptions,
  normalizeApplicantGymDisplayName,
} from "@/lib/applications/applicant-list-filters";
import type {
  FieldStatusRowDTO,
  FieldStatusSummaryDTO,
} from "@/lib/services/field-status.service";
import {
  ORGANIZER_FIELD_INPUT_CLASS,
  ORGANIZER_FIELD_SELECT_CLASS,
} from "@/lib/organizer-dashboard-layout";
import { CompactFilterResetButton } from "@/components/domain/shared/CompactApplicantFilterBar";

export function OnsiteOpsWeighInTab({
  eventId,
  rows,
  summary,
}: {
  eventId: string;
  rows: FieldStatusRowDTO[];
  summary: FieldStatusSummaryDTO;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gymFilter, setGymFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [weighInFilter, setWeighInFilter] = useState("all");
  const [summaryFilter, setSummaryFilter] =
    useState<FieldStatusSummaryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const gymOptions = useMemo(
    () => buildApplicantGymFilterOptions(rows),
    [rows],
  );

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.divisionId) map.set(row.divisionId, row.divisionLabel);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesFieldStatusSearchQuery(row, searchQuery)) return false;
      if (!matchesFieldStatusGymFilter(row, gymFilter)) return false;
      if (divisionFilter !== "all" && row.divisionId !== divisionFilter) {
        return false;
      }
      if (weighInFilter !== "all") {
        if (weighInFilter === "pending" && row.weighInStatus !== "pending") {
          return false;
        }
        if (
          weighInFilter === "pass" &&
          row.weighInStatus !== "pass" &&
          row.weighInStatus !== "manual_pass"
        ) {
          return false;
        }
        if (
          weighInFilter === "fail" &&
          row.weighInStatus !== "fail" &&
          row.weighInStatus !== "manual_fail"
        ) {
          return false;
        }
      }
      if (!matchesFieldStatusSummaryFilter(row, summaryFilter)) return false;
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

  const selectedRow =
    filteredRows.find((r) => r.applicationId === selectedId) ??
    rows.find((r) => r.applicationId === selectedId) ??
    null;

  if (selectedRow) {
    return (
      <OrganizerFieldStatusDetailPane
        row={selectedRow}
        eventId={eventId}
        onBack={() => setSelectedId(null)}
        onWeighInSaved={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <FieldStatusSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={setSummaryFilter}
      />

      <div className="space-y-2 rounded-lg border bg-muted/10 p-2.5">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="선수명·체육관·경기구분·체급 검색"
          aria-label="선수 검색"
          className={ORGANIZER_FIELD_INPUT_CLASS}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className={ORGANIZER_FIELD_SELECT_CLASS}
            aria-label="체육관 필터"
          >
            <option value="all">전체 체육관</option>
            {gymOptions.map((g) => (
              <option key={g.name} value={g.name}>
                {normalizeApplicantGymDisplayName(g.name)}
              </option>
            ))}
          </select>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className={ORGANIZER_FIELD_SELECT_CLASS}
            aria-label="경기구분 필터"
          >
            <option value="all">전체 경기구분</option>
            {divisionOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weighInFilter}
            onChange={(e) => setWeighInFilter(e.target.value)}
            className={ORGANIZER_FIELD_SELECT_CLASS}
            aria-label="계체 상태 필터"
          >
            <option value="all">전체 계체</option>
            <option value="pending">대기</option>
            <option value="pass">통과</option>
            <option value="fail">실패</option>
          </select>
          <CompactFilterResetButton
            onClick={() => {
              setSearchQuery("");
              setGymFilter("all");
              setDivisionFilter("all");
              setWeighInFilter("all");
              setSummaryFilter("all");
            }}
          />
        </div>
      </div>

      <OrganizerFieldStatusListPane
        rows={filteredRows}
        selectedApplicationId={selectedId}
        onSelect={(id) => setSelectedId(id)}
      />
    </div>
  );
}
