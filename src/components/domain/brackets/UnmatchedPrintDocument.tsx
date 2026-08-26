"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerUnmatchedPrintActions } from "@/components/domain/brackets/OrganizerUnmatchedPrintActions";
import type {
  UnmatchedPrintDocumentDto,
  UnmatchedPrintPageDto,
} from "@/lib/brackets/bracket-print-format";
import { cn } from "@/lib/utils";

export function UnmatchedPrintToolbar({
  eventId,
  documentTitle,
}: {
  eventId: string;
  documentTitle: string;
}) {
  return (
    <div className="bracket-print-toolbar no-print">
      <Link
        href={`/organizer/events/${eventId}/brackets?tab=view&view=workspace`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← 돌아가기
      </Link>
      <OrganizerUnmatchedPrintActions
        eventId={eventId}
        documentTitle={documentTitle}
        variant="toolbar"
      />
    </div>
  );
}

function UnmatchedPage({
  doc,
  page,
}: {
  doc: UnmatchedPrintDocumentDto;
  page: UnmatchedPrintPageDto;
}) {
  return (
    <section className="unmatched-print-page-sheet">
      <header className="unmatched-print-header">
        <p className="unmatched-print-event-title">{doc.eventName}</p>
        <h1 className="unmatched-print-doc-title">미매칭 선수 명단</h1>
        <p className="unmatched-print-subtitle">{page.rangeLabel}</p>
      </header>

      {page.rows.length === 0 ? (
        <p className="bracket-print-empty">미매칭 선수가 없습니다.</p>
      ) : (
        <table className="unmatched-print-table">
          <thead>
            <tr>
              <th className="unmatched-print-col-no">번호</th>
              <th className="unmatched-print-col-gym">체육관명</th>
              <th className="unmatched-print-col-name">선수명</th>
              <th className="unmatched-print-col-gender">성별</th>
              <th className="unmatched-print-col-division">경기구분</th>
              <th className="unmatched-print-col-record">전적</th>
              <th className="unmatched-print-col-weight">신청 체중</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.index}>
                <td className="unmatched-print-col-no">{row.index}</td>
                <td className="unmatched-print-col-gym">{row.gymName}</td>
                <td className="unmatched-print-col-name">{row.fighterName}</td>
                <td className="unmatched-print-col-gender">{row.genderLabel}</td>
                <td className="unmatched-print-col-division">
                  {row.divisionLabel}
                </td>
                <td className="unmatched-print-col-record">{row.recordLabel}</td>
                <td className="unmatched-print-col-weight">{row.weightLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="unmatched-print-footer">
        <span>{doc.footerNote}</span>
        <span className="unmatched-print-footer-page">
          {page.pageIndex} / {page.pageCount}
        </span>
      </footer>
    </section>
  );
}

export function UnmatchedPrintDocument({
  doc,
}: {
  doc: UnmatchedPrintDocumentDto;
}) {
  return (
    <div className="bracket-print-sheet unmatched-print-root">
      {doc.pages.map((page) => (
        <UnmatchedPage key={page.pageIndex} doc={doc} page={page} />
      ))}
    </div>
  );
}
