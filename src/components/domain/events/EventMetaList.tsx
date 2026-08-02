import {
  formatPublicDate,
  formatPublicPeriod,
} from "@/lib/date-display";
import { cn } from "@/lib/utils";

export type EventMetaListDensity = "full" | "summary";

/**
 * 대회 메타 목록.
 * - summary: 공고 목록 카드용 (대회일·장소·신청기간만)
 * - full: 상세/레거시용 (주최·종목·체급 포함)
 */
export function EventMetaList({
  eventDate,
  location,
  registrationStartDate,
  registrationEndDate,
  organizerName,
  primarySport,
  divisionSummary,
  compact,
  density = "full",
  className,
}: {
  eventDate: string;
  location: string | null;
  registrationStartDate: string;
  registrationEndDate: string;
  organizerName: string;
  primarySport?: string | null;
  divisionSummary?: string;
  compact?: boolean;
  density?: EventMetaListDensity;
  className?: string;
}) {
  const text = compact ? "text-xs" : "text-sm";
  const summary = density === "summary";
  const locationText = location?.trim() || null;
  const periodText = formatPublicPeriod(
    registrationStartDate,
    registrationEndDate,
  ).trim();

  return (
    <ul className={cn(summary ? "space-y-1" : "space-y-1.5", text, className)}>
      <li className="min-w-0">
        <span className="text-muted-foreground">대회일 </span>
        <span className="font-medium">{formatPublicDate(eventDate)}</span>
      </li>
      {locationText ? (
        <li className="min-w-0">
          <span className="text-muted-foreground">장소 </span>
          <span className="font-medium line-clamp-2">{locationText}</span>
        </li>
      ) : null}
      {periodText ? (
        <li className="min-w-0">
          <span className="text-muted-foreground">신청 </span>
          <span
            className={cn(
              "font-medium",
              summary ? "line-clamp-2 md:line-clamp-1" : "line-clamp-2",
            )}
          >
            {periodText}
          </span>
        </li>
      ) : null}
      {!summary ? (
        <>
          <li className="min-w-0">
            <span className="text-muted-foreground">주최 </span>
            <span className="font-medium line-clamp-1">{organizerName}</span>
          </li>
          {primarySport ? (
            <li className="min-w-0">
              <span className="text-muted-foreground">종목 </span>
              <span className="font-medium">{primarySport}</span>
            </li>
          ) : null}
          {divisionSummary ? (
            <li className="min-w-0 text-muted-foreground line-clamp-2">
              {divisionSummary}
            </li>
          ) : null}
        </>
      ) : null}
    </ul>
  );
}
