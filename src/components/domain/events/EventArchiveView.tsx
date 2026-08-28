"use client";

import { useMemo, useState } from "react";
import { exportEventArchiveApplicantsExcelAction } from "@/features/events/actions";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  defaultApplicantExcelExportFieldKeys,
} from "@/lib/applications/applicant-excel-export-fields";
import { extractApplicantArchiveDisplayLabels } from "@/lib/event-archive/applicant-display";
import type { EventArchiveViewModel } from "@/lib/services/event-archive.service";
import {
  ExcelExportTriggerButton,
  SelectableExcelExportDialog,
} from "@/components/shared/excel-export/SelectableExcelExportDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPublicDateTime } from "@/lib/date-display";
import "./event-archive-print.css";

type TabId = "summary" | "applicants" | "bracket" | "results";

const TAB_LABELS: Record<TabId, string> = {
  summary: "요약",
  applicants: "신청자",
  bracket: "최종 대진표",
  results: "경기 결과",
};

function formatMatchLabel(
  matchNumber: number | null,
  globalMatchOrder: number | null,
): string {
  if (matchNumber != null) return `${matchNumber}경기`;
  if (globalMatchOrder != null) return `${globalMatchOrder}번`;
  return "—";
}

function cornerLabel(
  corner: { name: string; gymName: string | null } | null,
): string {
  if (!corner) return "—";
  if (corner.gymName) return `${corner.name} (${corner.gymName})`;
  return corner.name;
}

export function EventArchiveView({ archive }: { archive: EventArchiveViewModel }) {
  const [tab, setTab] = useState<TabId>("summary");
  const [excelOpen, setExcelOpen] = useState(false);

  const sortedBracket = useMemo(
    () =>
      [...archive.bracketSnapshot.matches].sort((a, b) => {
        const ao = a.globalMatchOrder ?? a.matchNumber ?? a.matchOrder;
        const bo = b.globalMatchOrder ?? b.matchNumber ?? b.matchOrder;
        return ao - bo;
      }),
    [archive.bracketSnapshot.matches],
  );

  const sortedResults = useMemo(
    () =>
      [...archive.resultsSnapshot.rows].sort((a, b) => {
        const an = a.matchNumber ?? 0;
        const bn = b.matchNumber ?? 0;
        return an - bn;
      }),
    [archive.resultsSnapshot.rows],
  );

  return (
    <div className="event-archive-root space-y-4" data-print-tab={tab}>
      <header className="event-archive-print-header hidden print:block">
        <h1 className="text-lg font-bold">{archive.eventSnapshot.title}</h1>
        <p className="text-sm">
          {archive.eventSnapshot.eventDateLabel} ·{" "}
          {archive.eventSnapshot.locationLabel}
        </p>
        <p className="text-muted-foreground text-xs">
          {TAB_LABELS[tab]} · 기록 v{archive.version} ·{" "}
          {formatPublicDateTime(archive.archivedAt)}
        </p>
      </header>

      <div className="event-archive-no-print flex flex-wrap items-center gap-2">
        {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          {tab === "applicants" ? (
            <ExcelExportTriggerButton onOpen={() => setExcelOpen(true)} />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            {TAB_LABELS[tab]} 인쇄
          </Button>
        </div>
      </div>

      {tab === "summary" ? (
        <section
          className={cn(
            "event-archive-tab-panel event-archive-tab-summary ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm md:p-6",
          )}
        >
          <h2 className="text-lg font-semibold">대회 기록 요약</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">대회명</dt>
              <dd className="font-medium">{archive.eventSnapshot.title}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">대회일</dt>
              <dd>{archive.eventSnapshot.eventDateLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">장소</dt>
              <dd>{archive.eventSnapshot.locationLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">주최</dt>
              <dd>{archive.eventSnapshot.organizerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">접수 기간</dt>
              <dd>{archive.eventSnapshot.registrationPeriodLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">기록 확정</dt>
              <dd>{formatPublicDateTime(archive.archivedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">신청자</dt>
              <dd>{archive.summary.applicantCount}명</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">출전 선수</dt>
              <dd>{archive.summary.participantCount}명</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">총 경기</dt>
              <dd>{archive.summary.totalMatchCount}경기</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">완료 경기</dt>
              <dd>{archive.summary.completedMatchCount}경기</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">경기구분</dt>
              <dd>{archive.summary.divisionCount}개</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {tab === "applicants" ? (
        <section
          className={cn(
            "event-archive-tab-panel event-archive-tab-applicants ring-foreground/10 overflow-x-auto rounded-xl border bg-card shadow-sm",
          )}
        >
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">체육관</th>
                <th className="px-3 py-2 font-medium">선수명</th>
                <th className="px-3 py-2 font-medium">연락처</th>
                <th className="px-3 py-2 font-medium">성별</th>
                <th className="px-3 py-2 font-medium">경기구분</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">입금</th>
              </tr>
            </thead>
            <tbody>
              {archive.applicantsSnapshot.rows.map((row, i) => {
                const labels = extractApplicantArchiveDisplayLabels(row);
                return (
                  <tr key={row.applicationId} className="border-b last:border-0">
                    <td className="text-muted-foreground px-3 py-2 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">{row.gymName}</td>
                    <td className="px-3 py-2 font-medium">{row.fighterName}</td>
                    <td className="px-3 py-2">{row.phone ?? "—"}</td>
                    <td className="px-3 py-2">{labels.genderLabel}</td>
                    <td className="px-3 py-2">{labels.divisionLabel}</td>
                    <td className="px-3 py-2">{labels.statusLabel}</td>
                    <td className="px-3 py-2">{labels.paymentLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "bracket" ? (
        <section
          className={cn(
            "event-archive-tab-panel event-archive-tab-bracket ring-foreground/10 overflow-x-auto rounded-xl border bg-card shadow-sm",
          )}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">경기</th>
                <th className="px-3 py-2 font-medium">대진표</th>
                <th className="px-3 py-2 font-medium">경기구분</th>
                <th className="px-3 py-2 font-medium">RED</th>
                <th className="px-3 py-2 font-medium">BLUE</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">승자</th>
              </tr>
            </thead>
            <tbody>
              {sortedBracket.map((m) => (
                <tr key={m.matchId} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                    {formatMatchLabel(m.matchNumber, m.globalMatchOrder)}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2">
                    {m.bracketTitle}
                  </td>
                  <td className="text-muted-foreground max-w-[160px] truncate px-3 py-2">
                    {m.divisionLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">{cornerLabel(m.red)}</td>
                  <td className="px-3 py-2">{cornerLabel(m.blue)}</td>
                  <td className="px-3 py-2">{m.statusLabel}</td>
                  <td className="px-3 py-2">{m.winnerName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "results" ? (
        <section
          className={cn(
            "event-archive-tab-panel event-archive-tab-results ring-foreground/10 overflow-x-auto rounded-xl border bg-card shadow-sm",
          )}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">경기</th>
                <th className="px-3 py-2 font-medium">경기구분</th>
                <th className="px-3 py-2 font-medium">선수</th>
                <th className="px-3 py-2 font-medium">상대</th>
                <th className="px-3 py-2 font-medium">결과</th>
                <th className="px-3 py-2 font-medium">승리방식</th>
                <th className="px-3 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r) => (
                <tr key={r.resultId} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {r.matchNumber != null ? `${r.matchNumber}경기` : "—"}
                  </td>
                  <td className="text-muted-foreground max-w-[140px] truncate px-3 py-2">
                    {r.divisionLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.fighterName}
                    {r.fighterGymName ? ` (${r.fighterGymName})` : ""}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {r.opponentName ?? "—"}
                    {r.opponentGymName ? ` (${r.opponentGymName})` : ""}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.resultLabel}</td>
                  <td className="px-3 py-2">{r.resultTypeLabel ?? "—"}</td>
                  <td className="px-3 py-2">{r.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <SelectableExcelExportDialog
        open={excelOpen}
        onOpenChange={setExcelOpen}
        title="기록 신청자 엑셀 다운로드"
        fields={APPLICANT_EXCEL_EXPORT_FIELDS}
        defaultSelectedKeys={defaultApplicantExcelExportFieldKeys()}
        hasActiveFilters={false}
        filteredCount={archive.applicantsSnapshot.totalCount}
        totalCount={archive.applicantsSnapshot.totalCount}
        scopeLabels={{
          filtered: (n) => `기록 신청자 (${n}명)`,
          all: (n) => `기록 신청자 (${n}명)`,
          allOnly: (n) => `기록 신청자 ${n}명`,
        }}
        emptyScopeMessage="다운로드할 신청자가 없습니다."
        onDownload={async ({ fieldKeys }) => {
          const res = await exportEventArchiveApplicantsExcelAction({
            eventId: archive.eventId,
            fieldKeys,
          });
          if (!res.ok) {
            return { ok: false as const, message: res.error.message };
          }
          return {
            ok: true as const,
            base64: res.data.base64,
            filename: res.data.filename,
          };
        }}
      />
    </div>
  );
}
