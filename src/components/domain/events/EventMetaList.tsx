import {
  formatPublicDate,
  formatPublicPeriod,
} from "@/lib/date-display";
import { cn } from "@/lib/utils";

export function EventMetaList({
  eventDate,
  location,
  registrationStartDate,
  registrationEndDate,
  organizerName,
  primarySport,
  divisionSummary,
  compact,
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
  className?: string;
}) {
  const text = compact ? "text-xs" : "text-sm";

  return (
    <ul className={cn("space-y-1.5", text, className)}>
      <li>
        <span className="text-muted-foreground">대회일 </span>
        <span className="font-medium">{formatPublicDate(eventDate)}</span>
      </li>
      <li>
        <span className="text-muted-foreground">장소 </span>
        <span className="font-medium line-clamp-2">{location ?? "추후 안내"}</span>
      </li>
      <li>
        <span className="text-muted-foreground">신청 </span>
        <span className="font-medium line-clamp-2">
          {formatPublicPeriod(registrationStartDate, registrationEndDate)}
        </span>
      </li>
      <li>
        <span className="text-muted-foreground">주최 </span>
        <span className="font-medium line-clamp-1">{organizerName}</span>
      </li>
      {primarySport ? (
        <li>
          <span className="text-muted-foreground">종목 </span>
          <span className="font-medium">{primarySport}</span>
        </li>
      ) : null}
      {divisionSummary ? (
        <li className="text-muted-foreground line-clamp-2">{divisionSummary}</li>
      ) : null}
    </ul>
  );
}
