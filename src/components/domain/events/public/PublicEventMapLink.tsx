import { MapPin } from "lucide-react";
import { buildMapSearchUrl } from "@/lib/event-public-display";
import { cn } from "@/lib/utils";

export function PublicEventMapLink({
  location,
  locationName,
  roadAddress,
  jibunAddress,
  className,
  compact,
}: {
  location?: string | null;
  locationName?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const href = buildMapSearchUrl({
    locationName,
    roadAddress,
    jibunAddress,
    location,
  });
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 font-medium text-primary transition-colors hover:bg-primary/10",
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      <MapPin className={compact ? "size-3" : "size-3.5"} aria-hidden />
      네이버 지도에서 보기
    </a>
  );
}
