import Link from "next/link";
import {
  publicEventPageEyebrowClass,
  publicEventPageTitleClass,
} from "@/components/domain/events/public/public-event-ui";

export function PublicEventSubpageHeader({
  slug,
  title,
  eventTitle,
  description,
}: {
  slug: string;
  title: string;
  eventTitle: string;
  description?: string;
}) {
  return (
    <header className="mb-2 space-y-2">
      <Link
        href={`/events/${slug}`}
        className="inline-flex text-sm font-bold text-matchon-primary hover:underline"
      >
        ← 행사 안내
      </Link>
      <p className={publicEventPageEyebrowClass}>Event</p>
      <h1 className={publicEventPageTitleClass}>{title}</h1>
      <p className="text-sm text-matchon-text-secondary">{eventTitle}</p>
      {description ? (
        <p className="text-xs leading-relaxed text-matchon-text-secondary">
          {description}
        </p>
      ) : null}
    </header>
  );
}
