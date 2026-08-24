"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerBracketPrintActions } from "@/components/domain/brackets/OrganizerBracketPrintActions";
import type { BracketPrintDocumentDto } from "@/lib/brackets/bracket-print-format";
import { cn } from "@/lib/utils";

export function BracketPrintToolbar({
  eventId,
  documentTitle,
}: {
  eventId: string;
  documentTitle: string;
}) {
  return (
    <div className="bracket-print-toolbar no-print">
      <Link
        href={`/organizer/events/${eventId}/brackets?tab=view`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← 돌아가기
      </Link>
      <OrganizerBracketPrintActions
        eventId={eventId}
        documentTitle={documentTitle}
        variant="toolbar"
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

export function BracketPrintDocument({
  doc,
}: {
  doc: BracketPrintDocumentDto;
}) {
  const metaParts = [doc.eventDateLabel, doc.venueLabel].filter(Boolean);

  return (
    <div className="bracket-print-sheet">
      <header className="bracket-print-header">
        <h1 className="bracket-print-event-title">{doc.eventName}</h1>
        <p className="bracket-print-doc-title">시합 대진표</p>
        {metaParts.length > 0 ? (
          <p className="bracket-print-meta">{metaParts.join(" · ")}</p>
        ) : null}
      </header>

      {doc.matches.length === 0 ? (
        <p className="bracket-print-empty">출력할 경기가 없습니다.</p>
      ) : (
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
                    <span className="bracket-print-match-no">
                      {m.matchNoLabel}
                    </span>
                    {m.arenaName ? (
                      <span className="bracket-print-match-sub">
                        {m.arenaName}
                      </span>
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
      )}
    </div>
  );
}
