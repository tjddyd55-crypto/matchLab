import {
  EVENT_POSTER_UPLOAD_DESCRIPTION,
  EVENT_POSTER_UPLOAD_FILE_HINT,
  EVENT_POSTER_UPLOAD_HELP,
  EVENT_POSTER_UPLOAD_HINT,
  EVENT_POSTER_UPLOAD_TITLE,
  EVENT_POSTER_ASPECT_MISMATCH_WARNING,
} from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

export function EventPosterAspectWarningBox({
  message = EVENT_POSTER_ASPECT_MISMATCH_WARNING,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function EventPosterUploadGuide({
  title = EVENT_POSTER_UPLOAD_TITLE,
  footerNote,
  className,
}: {
  title?: string;
  footerNote?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {EVENT_POSTER_UPLOAD_DESCRIPTION}
      </p>
      <p className="inline-flex w-fit rounded-md border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
        {EVENT_POSTER_UPLOAD_HINT}
      </p>
      <p className="text-muted-foreground text-xs">{EVENT_POSTER_UPLOAD_FILE_HINT}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {EVENT_POSTER_UPLOAD_HELP}
      </p>
      {footerNote ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{footerNote}</p>
      ) : null}
    </div>
  );
}
