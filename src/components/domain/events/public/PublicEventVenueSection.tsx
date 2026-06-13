import type { PublicEventDetailDTO } from "@/lib/dto/public";
import {
  buildMapSearchQuery,
  resolvePublicVenueFields,
} from "@/lib/event-public-display";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";
import { PublicEventNaverMapPreview } from "@/components/domain/events/public/PublicEventNaverMapPreview";

export function PublicEventVenueSection({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  const venue = resolvePublicVenueFields({
    locationName: event.locationName,
    roadAddress: event.roadAddress,
    jibunAddress: event.jibunAddress,
    detailAddress: event.detailAddress,
    location: event.location,
  });

  const displayAddress = venue.roadAddress?.trim() || venue.location?.trim() || null;
  const mapQuery = buildMapSearchQuery(venue);

  if (!mapQuery && !displayAddress && !venue.locationName?.trim()) {
    return null;
  }

  const mapLinkProps = {
    locationName: venue.locationName,
    roadAddress: venue.roadAddress,
    jibunAddress: venue.jibunAddress,
    location: venue.location,
  };

  const markerTitle = venue.locationName?.trim() || event.title;

  return (
    <section className="min-w-0 space-y-4 rounded-xl border p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold md:text-lg">오시는 길</h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          행사 장소와 주소를 확인하고 네이버 지도에서 길을 찾을 수 있습니다.
        </p>
      </div>

      <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
        {venue.locationName ? (
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">장소</dt>
            <dd className="font-medium break-words">{venue.locationName}</dd>
          </div>
        ) : null}
        {displayAddress ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">주소</dt>
            <dd className="break-words">{displayAddress}</dd>
          </div>
        ) : null}
        {venue.detailAddress ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">상세 주소</dt>
            <dd className="break-words">{venue.detailAddress}</dd>
          </div>
        ) : null}
      </dl>

      <PublicEventNaverMapPreview
        key={`${event.venueMapLat ?? "x"}-${event.venueMapLng ?? "y"}`}
        lat={event.venueMapLat}
        lng={event.venueMapLng}
        markerTitle={markerTitle}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <PublicEventMapLink {...mapLinkProps} />
      </div>
    </section>
  );
}
