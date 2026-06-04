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
  return (
    <div className={cn("text-muted-foreground space-y-1 text-xs leading-relaxed", className)}>
      <p>
        <span className="font-medium text-foreground">
          {formatPublicDate(eventDate)}
        </span>
        {" · "}
        {location ?? "장소 추후 안내"}
      </p>
      <p>{formatPublicPeriod(registrationStartDate, registrationEndDate)}</p>
      {showOrganizer && organizerName ? (
        <p className="line-clamp-1">주최 {organizerName}</p>
      ) : null}
    </div>
  );
}
