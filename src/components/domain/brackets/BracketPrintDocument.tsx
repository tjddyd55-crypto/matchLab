"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { BracketPrintDocumentDto } from "@/lib/brackets/bracket-print-format";
import { cn } from "@/lib/utils";

export function BracketPrintToolbar({
  eventId,
  documentTitle,
}: {
  eventId: string;
  documentTitle: string;
}) {
  const onPrint = useCallback(() => {
    const prev = document.title;
    document.title = documentTitle;
    window.print();
    document.title = prev;
  }, [documentTitle]);

  return (
    <div className="bracket-print-toolbar no-print">
      <Link
        href={`/organizer/events/${eventId}/brackets?tab=view`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← 돌아가기
      </Link>
      <div className="bracket-print-toolbar-actions">
        <Button type="button" size="sm" onClick={onPrint}>
          인쇄 / PDF 저장
        </Button>
      </div>
    </div>
  );
}

/** 긴 EventDivision label → 첫 세그먼트(연령부) compact */
function compactAgeGroupFromDivisionLabel(
  divisionLabel: string | null | undefined,
): string | null {
  const raw = divisionLabel?.trim();
  if (!raw) return null;
  const first = raw.split(" · ")[0]?.trim();
  return first || null;
}

function compactMatchSubLabel(input: {
  arenaName: string | null;
  divisionLabel: string | null;
}): string | null {
  const age = compactAgeGroupFromDivisionLabel(input.divisionLabel);
  const genderRaw = input.divisionLabel?.split(" · ")[1]?.trim() ?? null;
  let category = age;
  if (age && genderRaw) {
    const g = genderRaw.includes("남")
      ? "남성"
      : genderRaw.includes("여")
        ? "여성"
        : null;
    category = g ? `${age} ${g}` : age;
  }
  const parts = [input.arenaName, category].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function fighterCategoryLabel(
  divisionLabel: string | null | undefined,
  gradeLabel: string | null | undefined,
): string | null {
  const age = compactAgeGroupFromDivisionLabel(divisionLabel);
  if (age && gradeLabel && !age.includes(gradeLabel)) {
    return `${age} · ${gradeLabel}`;
  }
  return age || gradeLabel || null;
}

function FighterCell({
  fighter,
  divisionLabel,
  emptyLabel = "미정",
}: {
  fighter: BracketPrintDocumentDto["matches"][number]["red"];
  divisionLabel: string | null;
  emptyLabel?: string;
}) {
  if (!fighter) {
    return <div className="bracket-print-fighter">{emptyLabel}</div>;
  }
  const category = fighterCategoryLabel(divisionLabel, fighter.gradeLabel);
  const detail = [fighter.gymName, category, fighter.weightLabel]
    .filter(Boolean)
    .join(" / ");
  return (
    <div className="bracket-print-fighter">
      <div className="bracket-print-fighter-name">{fighter.name}</div>
      {detail ? (
        <div className="bracket-print-fighter-detail">{detail}</div>
      ) : null}
      <div className="bracket-print-fighter-record">
        {fighter.recordLabel || "-"}
      </div>
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
              <th className="bracket-print-col-red bracket-print-th-red">
                레드 코너
              </th>
              <th className="bracket-print-col-vs">VS</th>
              <th className="bracket-print-col-blue bracket-print-th-blue">
                블루 코너
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.matches.map((m) => {
              const matchSub = compactMatchSubLabel({
                arenaName: m.arenaName,
                divisionLabel: m.divisionLabel,
              });
              return (
                <tr key={m.matchId} className="bracket-print-row">
                  <td className="bracket-print-col-no">
                    <div className="bracket-print-match-meta">
                      <span className="bracket-print-match-no">
                        {m.matchNoLabel}
                      </span>
                      {matchSub ? (
                        <span className="bracket-print-match-sub">
                          {matchSub}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="bracket-print-col-red bracket-print-cell-red">
                    <FighterCell
                      fighter={m.red}
                      divisionLabel={m.divisionLabel}
                    />
                  </td>
                  <td className="bracket-print-col-vs">VS</td>
                  <td className="bracket-print-col-blue bracket-print-cell-blue">
                    <FighterCell
                      fighter={m.blue}
                      divisionLabel={m.divisionLabel}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
