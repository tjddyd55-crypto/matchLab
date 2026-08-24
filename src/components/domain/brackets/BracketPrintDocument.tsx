"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerBracketPrintActions } from "@/components/domain/brackets/OrganizerBracketPrintActions";
import {
  buildBracketPrintFighterMetaLine,
  type BracketPrintDocumentDto,
  type BracketPrintFighterDto,
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

function FighterCell({
  fighter,
  emptyLabel = "미정",
}: {
  fighter: BracketPrintDocumentDto["matches"][number]["red"];
  emptyLabel?: string;
}) {
  if (!fighter) {
    return <div className="bracket-print-fighter">{emptyLabel}</div>;
  }
  const rest = [fighter.gymName, fighter.weightLabel, fighter.gradeLabel]
    .filter(Boolean)
    .join(" / ");
  return (
    <div className="bracket-print-fighter">
      <div className="bracket-print-fighter-name">{fighter.name}</div>
      {rest ? <div className="bracket-print-fighter-rest">{rest}</div> : null}
    </div>
  );
}

function AllMatchesFighterCorner({
  fighter,
  corner,
}: {
  fighter: BracketPrintFighterDto | null;
  corner: "red" | "blue";
}) {
  const meta = buildBracketPrintFighterMetaLine(fighter);
  return (
    <div
      className={cn(
        "all-matches-print-corner",
        corner === "red"
          ? "all-matches-print-corner-red"
          : "all-matches-print-corner-blue",
      )}
    >
      {fighter ? (
        <>
          <div className="all-matches-print-gym">{fighter.gymName}</div>
          <div className="all-matches-print-name">{fighter.name}</div>
          {meta ? (
            <div className="all-matches-print-meta">{meta}</div>
          ) : null}
        </>
      ) : (
        <div className="all-matches-print-empty">미정</div>
      )}
    </div>
  );
}

function AllMatchesPrintBlocks({
  doc,
}: {
  doc: BracketPrintDocumentDto;
}) {
  return (
    <div className="all-matches-print-list">
      {doc.matches.map((m) => (
        <article key={m.matchId} className="all-matches-print-block">
          <header className="all-matches-print-block-head">
            <span className="all-matches-print-match-no">{m.matchNoLabel}</span>
            {m.divisionLabel ? (
              <span className="all-matches-print-division">
                {m.divisionLabel}
              </span>
            ) : null}
          </header>
          <div className="all-matches-print-fighters">
            <AllMatchesFighterCorner fighter={m.red} corner="red" />
            <div className="all-matches-print-vs">VS</div>
            <AllMatchesFighterCorner fighter={m.blue} corner="blue" />
          </div>
          {m.opsLine ? (
            <div className="all-matches-print-ops">{m.opsLine}</div>
          ) : null}
          {m.organizerMemo ? (
            <div className="all-matches-print-memo">
              <span className="all-matches-print-memo-label">메모</span>
              <span className="all-matches-print-memo-body">
                {m.organizerMemo}
              </span>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CourtPrintTable({ doc }: { doc: BracketPrintDocumentDto }) {
  return (
    <table className="bracket-print-table">
      <thead>
        <tr>
          <th className="bracket-print-col-no">경기</th>
          <th className="bracket-print-col-red">
            레드 코너
            <br />
            <span style={{ fontWeight: 500 }}>
              (이름 / 체육관 / kg / 학년)
            </span>
          </th>
          <th className="bracket-print-col-record">전적</th>
          <th className="bracket-print-col-vs">VS</th>
          <th className="bracket-print-col-blue">
            블루 코너
            <br />
            <span style={{ fontWeight: 500 }}>
              (이름 / 체육관 / kg / 학년)
            </span>
          </th>
          <th className="bracket-print-col-record">전적</th>
        </tr>
      </thead>
      <tbody>
        {doc.matches.map((m) => (
          <tr key={m.matchId} className="bracket-print-row">
            <td className="bracket-print-col-no">
              <div className="bracket-print-match-meta">
                <span className="bracket-print-match-no">{m.matchNoLabel}</span>
                {m.arenaName ? (
                  <span className="bracket-print-match-sub">{m.arenaName}</span>
                ) : null}
                {m.divisionLabel ? (
                  <span className="bracket-print-match-sub">
                    {m.divisionLabel}
                  </span>
                ) : null}
              </div>
            </td>
            <td className="bracket-print-col-red bracket-print-cell-red">
              <FighterCell fighter={m.red} />
            </td>
            <td className="bracket-print-col-record">
              {m.red?.recordLabel ?? "-"}
            </td>
            <td className="bracket-print-col-vs">VS</td>
            <td className="bracket-print-col-blue bracket-print-cell-blue">
              <FighterCell fighter={m.blue} />
            </td>
            <td className="bracket-print-col-record">
              {m.blue?.recordLabel ?? "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BracketPrintDocument({
  doc,
}: {
  doc: BracketPrintDocumentDto;
}) {
  const metaParts = [doc.eventDateLabel, doc.venueLabel].filter(Boolean);
  const isAllMatches = doc.mode === "all-matches";

  return (
    <div className="bracket-print-sheet">
      <header className="bracket-print-header">
        <h1 className="bracket-print-event-title">{doc.eventName}</h1>
        <p className="bracket-print-doc-title">
          {isAllMatches ? "전체 경기 편집" : "시합 대진표"}
        </p>
        {metaParts.length > 0 ? (
          <p className="bracket-print-meta">{metaParts.join(" · ")}</p>
        ) : null}
      </header>

      {doc.matches.length === 0 ? (
        <p className="bracket-print-empty">출력할 경기가 없습니다.</p>
      ) : isAllMatches ? (
        <AllMatchesPrintBlocks doc={doc} />
      ) : (
        <CourtPrintTable doc={doc} />
      )}
    </div>
  );
}
