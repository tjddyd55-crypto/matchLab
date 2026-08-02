import {
  formatPublicDate,
  formatPublicPeriod,
} from "@/lib/date-display";
import { cn } from "@/lib/utils";

/** 모바일 카드·히어로용 짧은 메타 (2~3줄) */
export function EventMetaSummaryMobile({
  eventDate,
  location,
  registrationStartDate,
  registrationEndDate,
  organizerName,
  showOrganizer,
  className,
}: {
  eventDate: string;
  location: string | null;
  registrationStartDate: string;
  registrationEndDate: string;
  organizerName?: string;
  showOrganizer?: boolean;
  className?: string;
}) {
  const locationText = location?.trim() || null;
  const periodText = formatPublicPeriod(
    registrationStartDate,
    registrationEndDate,
  ).trim();

  return (
    <div
      className={cn(
        "text-muted-foreground space-y-1 text-xs leading-relaxed",
        className,
      )}
    >
      <p>
        <span className="text-muted-foreground">대회일 </span>
        <span className="font-medium text-foreground">
          {formatPublicDate(eventDate)}
        </span>
      </p>
      {locationText ? (
        <p className="min-w-0">
          <span className="text-muted-foreground">장소 </span>
          <span className="font-medium text-foreground line-clamp-2">
            {locationText}
          </span>
        </p>
      ) : null}
      {periodText ? (
        <p className="min-w-0 line-clamp-2">
          <span className="text-muted-foreground">신청 </span>
          <span className="font-medium text-foreground">{periodText}</span>
        </p>
      ) : null}
      {showOrganizer && organizerName ? (
        <p className="line-clamp-1">주최 {organizerName}</p>
      ) : null}
    </div>
  );
}
