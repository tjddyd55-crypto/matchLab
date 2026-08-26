"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerBracketPrintActions } from "@/components/domain/brackets/OrganizerBracketPrintActions";
import type {
  BracketPrintDocumentDto,
  BracketPrintFighterDto,
  BracketPrintMatchDto,
  BracketPrintPageDto,
} from "@/lib/brackets/bracket-print-format";
import { cn } from "@/lib/utils";

export function BracketPrintToolbar({
  eventId,
  documentTitle,
  printMode = "court",
}: {
  eventId: string;
  documentTitle: string;
  printMode?: "court" | "all-matches";
}) {
  return (
    <div className="bracket-print-toolbar no-print">
      <Link
        href={
          printMode === "all-matches"
            ? `/organizer/events/${eventId}/brackets?tab=view&view=workspace`
            : `/organizer/events/${eventId}/brackets?tab=view`
        }
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← 돌아가기
      </Link>
      <OrganizerBracketPrintActions
        eventId={eventId}
        documentTitle={documentTitle}
        variant="toolbar"
        printMode={printMode}
      />
    </div>
  );
}

function FighterCorner({
  fighter,
  corner,
}: {
  fighter: BracketPrintFighterDto | null;
  corner: "red" | "blue";
}) {
  return (
    <div
      className={cn(
        "ops-print-corner",
        corner === "red" ? "ops-print-corner-red" : "ops-print-corner-blue",
      )}
    >
      <span className="ops-print-corner-label">
        {corner === "red" ? "RED" : "BLUE"}
      </span>
      <div className="ops-print-corner-main">
        {fighter ? (
          <>
            <div className="ops-print-gym">{fighter.gymName || "소속 미상"}</div>
            <div className="ops-print-name">{fighter.name}</div>
            <div className="ops-print-record">{fighter.recordDisplayLabel}</div>
          </>
        ) : (
          <div className="ops-print-empty">
            <div className="ops-print-empty-title">원본 자료 없음</div>
            <div className="ops-print-empty-sub">경기 정보 미확정</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Figma 11:3 — 한 경기가 단일 grid row: 번호 | RED | VS | BLUE */
function MatchRow({ match }: { match: BracketPrintMatchDto }) {
  return (
    <article className="ops-print-row">
      <div className="ops-print-match-no-cell">
        <div className="ops-print-match-no">{match.matchNoLabel}</div>
        {match.weightLabel ? (
          <div className="ops-print-match-kg">{match.weightLabel}</div>
        ) : null}
      </div>
      <FighterCorner fighter={match.red} corner="red" />
      <div className="ops-print-vs">VS</div>
      <FighterCorner fighter={match.blue} corner="blue" />
    </article>
  );
}

function PrintPage({
  doc,
  page,
}: {
  doc: BracketPrintDocumentDto;
  page: BracketPrintPageDto;
}) {
  return (
    <section className="ops-print-page-sheet">
      <header className="ops-print-header">
        <h1 className="ops-print-event-title">{doc.eventName}</h1>
        <div className="ops-print-header-row">
          <span className="ops-print-range">{page.matchRangeLabel ?? ""}</span>
          <span className="ops-print-center-title">
            경기 대진표 <span className="ops-print-center-sep">|</span>{" "}
            <span className="ops-print-center-red">RED</span>
            <span className="ops-print-center-sep"> · </span>
            <span className="ops-print-center-blue">BLUE</span>
          </span>
          <span className="ops-print-page-num">
            {page.pageIndex} / {page.pageCount}
          </span>
        </div>
      </header>

      {page.matches.length === 0 ? (
        <p className="bracket-print-empty">출력할 경기가 없습니다.</p>
      ) : (
        <div className="ops-print-list">
          {page.matches.map((m) => (
            <MatchRow key={m.matchId} match={m} />
          ))}
        </div>
      )}

      <footer className="ops-print-footer">
        <span>{doc.footerNote}</span>
        <span className="ops-print-footer-page">
          {page.pageIndex} / {page.pageCount}
        </span>
      </footer>
    </section>
  );
}

export function BracketPrintDocument({
  doc,
}: {
  doc: BracketPrintDocumentDto;
}) {
  return (
    <div className="bracket-print-sheet ops-print-root">
      {doc.pages.map((page) => (
        <PrintPage key={page.pageIndex} doc={doc} page={page} />
      ))}
    </div>
  );
}
