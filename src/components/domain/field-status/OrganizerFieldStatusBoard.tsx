"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  matchesFieldStatusGymFilter,
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
  weighInSelectValueForFilter,
  type FieldStatusSummaryFilter,
} from "@/components/domain/field-status/field-status-filters";
import {
  buildApplicantGymFilterOptions,
  normalizeApplicantGymDisplayName,
} from "@/lib/applications/applicant-list-filters";
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
import type { WeighInStatus } from "@/generated/prisma";

type LastSaveNotice = {
  fighterName: string;
  weightKg: number;
  evaluationReason: string;
  autoStatus: WeighInStatus | null;
};

const HOLD_EMPTY_KEY_PREFIX = "matchon:checkin:holdEmpty:";
const NOTICE_KEY_PREFIX = "matchon:checkin:lastNotice:";

function readHoldEmptyFlag(eventId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(`${HOLD_EMPTY_KEY_PREFIX}${eventId}`);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > 15_000) {
      sessionStorage.removeItem(`${HOLD_EMPTY_KEY_PREFIX}${eventId}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function writeHoldEmptyFlag(eventId: string) {
  try {
    sessionStorage.setItem(
      `${HOLD_EMPTY_KEY_PREFIX}${eventId}`,
      String(Date.now()),
    );
  } catch {
    /* ignore */
  }
}

function clearHoldEmptyFlag(eventId: string) {
  try {
    sessionStorage.removeItem(`${HOLD_EMPTY_KEY_PREFIX}${eventId}`);
  } catch {
    /* ignore */
  }
}

function readLastNotice(eventId: string): LastSaveNotice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${NOTICE_KEY_PREFIX}${eventId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSaveNotice & { savedAt?: number };
    if (
      !parsed?.fighterName ||
      !parsed.savedAt ||
      Date.now() - parsed.savedAt > 15_000
    ) {
      sessionStorage.removeItem(`${NOTICE_KEY_PREFIX}${eventId}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLastNotice(eventId: string, notice: LastSaveNotice) {
  try {
    sessionStorage.setItem(
      `${NOTICE_KEY_PREFIX}${eventId}`,
      JSON.stringify({ ...notice, savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function formatNoticeKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function noticeStatusLabel(status: WeighInStatus | null): string | null {
  if (status === "pass" || status === "manual_pass") return "계체 통과";
  if (status === "fail" || status === "manual_fail") return "계체 실패";
  return null;
}

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
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gymFilter, setGymFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [summaryFilter, setSummaryFilter] =
    useState<FieldStatusSummaryFilter>("all");
  const [weighInFilter, setWeighInFilter] = useState("all");
  const [preferredApplicationId, setPreferredApplicationId] = useState<
    string | null
  >(null);
  /** 저장 후 다음 선수 자동 선택 방지 (refresh 리마운트 대응) */
  const [holdSelectionEmpty, setHoldSelectionEmpty] = useState(() =>
    readHoldEmptyFlag(eventId),
  );
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [lastSaveNotice, setLastSaveNotice] = useState<LastSaveNotice | null>(
    () => readLastNotice(eventId),
  );
  /** 저장 후 refresh가 검색 focus를 뺏을 때 한 번 더 복구 */
  const [searchFocusEpoch, setSearchFocusEpoch] = useState(0);
  const focusSearchAfterMountRef = useRef(readHoldEmptyFlag(eventId));

  useEffect(() => {
    if (!focusSearchAfterMountRef.current) return;
    focusSearchAfterMountRef.current = false;
    const t = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (searchFocusEpoch === 0 || !holdSelectionEmpty) return;
    const focus = () => {
      const el = searchRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      el.focus();
    };
    focus();
    const t0 = window.requestAnimationFrame(focus);
    // refresh 재렌더 이후 한 번 더 (루프 금지: epoch 고정)
    const t1 = window.setTimeout(focus, 280);
    return () => {
      window.cancelAnimationFrame(t0);
      window.clearTimeout(t1);
    };
  }, [
    searchFocusEpoch,
    holdSelectionEmpty,
    summary.weighInPending,
    summary.weighInPass,
    summary.weighInFail,
  ]);

  useEffect(() => {
    if (!lastSaveNotice) return;
    const t = window.setTimeout(() => {
      setLastSaveNotice(null);
      try {
        sessionStorage.removeItem(`${NOTICE_KEY_PREFIX}${eventId}`);
      } catch {
        /* ignore */
      }
    }, 3500);
    return () => window.clearTimeout(t);
  }, [lastSaveNotice, eventId]);

  const gymOptions = useMemo(
    () => buildApplicantGymFilterOptions(rows),
    [rows],
  );

  const gymCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = normalizeApplicantGymDisplayName(r.gymName);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.divisionId ?? "", r.divisionLabel);
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesFieldStatusSearchQuery(r, searchQuery)) return false;
      if (!matchesFieldStatusGymFilter(r, gymFilter)) return false;
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
    if (holdSelectionEmpty) return null;
    if (filtered.length === 0) return null;
    if (
      preferredApplicationId &&
      filtered.some((r) => r.applicationId === preferredApplicationId)
    ) {
      return preferredApplicationId;
    }
    return filtered[0]!.applicationId;
  }, [filtered, preferredApplicationId, holdSelectionEmpty]);

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
    clearHoldEmptyFlag(eventId);
    setHoldSelectionEmpty(false);
    setPreferredApplicationId(applicationId);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setMobileShowDetail(true);
    }
  }

  function handleWeighInSaved(info: LastSaveNotice) {
    writeHoldEmptyFlag(eventId);
    writeLastNotice(eventId, info);
    setLastSaveNotice(info);
    setSearchQuery("");
    setHoldSelectionEmpty(true);
    setPreferredApplicationId(null);
    setMobileShowDetail(false);
    setSearchFocusEpoch((n) => n + 1);
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

  const noticeLabel = lastSaveNotice
    ? noticeStatusLabel(lastSaveNotice.autoStatus)
    : null;

  return (
    <div className="flex flex-col gap-3 md:gap-3.5">
      <FieldStatusSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      {lastSaveNotice ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            noticeLabel === "계체 통과" &&
              "border-emerald-200 bg-emerald-50 text-emerald-900",
            noticeLabel === "계체 실패" &&
              "border-amber-200 bg-amber-50 text-amber-950",
            !noticeLabel && "border-slate-200 bg-slate-50 text-slate-800",
          )}
          role="status"
        >
          <span className="font-semibold">{lastSaveNotice.fighterName}</span>
          {" · "}
          {formatNoticeKg(lastSaveNotice.weightKg)}kg
          {noticeLabel ? ` · ${noticeLabel}` : ""}
          <span className="mt-0.5 block text-xs opacity-90">
            {lastSaveNotice.evaluationReason}
          </span>
        </div>
      ) : null}

      <div className={compactApplicantFilterBarClass}>
        <div className={compactApplicantFilterRowClass}>
          <input
            ref={searchRef}
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
              <option value="all">체육관 전체 ({rows.length})</option>
              {gymOptions.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({gymCounts.get(g.name) ?? 0})
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
        data-testid="checkin-workspace"
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
              onWeighInSaved={handleWeighInSaved}
            />
          ) : (
            <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
              {holdSelectionEmpty
                ? "다음 선수를 검색하거나 목록에서 선택하세요."
                : "선수를 선택하면 상세·조치를 처리할 수 있습니다."}
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
            onWeighInSaved={handleWeighInSaved}
          />
        ) : (
          listContent
        )}
      </div>
    </div>
  );
}
