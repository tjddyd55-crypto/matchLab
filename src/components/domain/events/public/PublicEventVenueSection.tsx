import type { PublicEventDetailDTO } from "@/lib/dto/public";
import {
  buildMapSearchQuery,
  buildMapSearchUrl,
} from "@/lib/event-public-display";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";
import { MapPin } from "lucide-react";

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
  const mapHref = buildMapSearchUrl({
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
    <section className="space-y-4 rounded-xl border p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold md:text-lg">오시는 길</h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          행사 장소와 주소를 확인하고 네이버 지도에서 길을 찾을 수 있습니다.
        </p>
      </div>

      <dl className="space-y-2 text-sm">
        {venueName ? (
          <div>
            <dt className="text-muted-foreground text-xs">장소명</dt>
            <dd className="font-medium">{venueName}</dd>
          </div>
        ) : null}
        {road ? (
          <div>
            <dt className="text-muted-foreground text-xs">도로명 주소</dt>
            <dd>{road}</dd>
          </div>
        ) : event.location?.trim() ? (
          <div>
            <dt className="text-muted-foreground text-xs">장소</dt>
            <dd>{event.location}</dd>
          </div>
        ) : null}
        {detail ? (
          <div>
            <dt className="text-muted-foreground text-xs">상세 주소</dt>
            <dd>{detail}</dd>
          </div>
        ) : null}
      </dl>

      <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
        <MapPin className="text-muted-foreground size-10" aria-hidden />
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
          지도는 네이버 지도에서 확인할 수 있습니다. 아래 버튼을 눌러
          검색·길찾기를 이용해 주세요.
        </p>
        {mapHref ? (
          <PublicEventMapLink
            locationName={event.locationName}
            roadAddress={event.roadAddress}
            location={event.location}
          />
        ) : null}
      </div>
    </section>
  );
}
