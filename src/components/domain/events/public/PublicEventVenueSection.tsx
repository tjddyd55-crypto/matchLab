import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { buildMapSearchQuery } from "@/lib/event-public-display";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";
import { PublicEventNaverMapPreview } from "@/components/domain/events/public/PublicEventNaverMapPreview";

export function PublicEventVenueSection({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  const mapQuery = buildMapSearchQuery({
    locationName: event.locationName,
    roadAddress: event.roadAddress,
    location: event.location,
  });

  if (!mapQuery && !event.location?.trim()) {
    return null;
  }

  const venueName = event.locationName?.trim();
  const road = event.roadAddress?.trim();
  const detail = event.detailAddress?.trim();

  return (
    <section className="min-w-0 space-y-4 rounded-xl border p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold md:text-lg">오시는 길</h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          행사 장소와 주소를 확인하고 네이버 지도에서 길을 찾을 수 있습니다.
        </p>
      </div>

      <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
        {venueName ? (
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">장소명</dt>
            <dd className="font-medium break-words">{venueName}</dd>
          </div>
        ) : null}
        {road ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">도로명 주소</dt>
            <dd className="break-words">{road}</dd>
          </div>
        ) : event.location?.trim() ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">장소</dt>
            <dd className="break-words">{event.location}</dd>
          </div>
        ) : null}
        {detail ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">상세 주소</dt>
            <dd className="break-words">{detail}</dd>
          </div>
        ) : null}
      </dl>

      <PublicEventNaverMapPreview
        key={mapQuery ?? "venue"}
        locationName={event.locationName}
        roadAddress={event.roadAddress}
        detailAddress={event.detailAddress}
        location={event.location}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <PublicEventMapLink
          locationName={event.locationName}
          roadAddress={event.roadAddress}
          location={event.location}
        />
      </div>
    </section>
  );
}
