"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  geocodeVenueWithFallback,
  isNaverMapConfigured,
  loadNaverMapsScript,
} from "@/lib/naver-map-client";
import { cn } from "@/lib/utils";

function MapPlaceholder({
  hint,
}: {
  hint?: string;
}) {
  return (
    <div className="bg-muted/30 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center md:min-h-[320px]">
      <MapPin className="text-muted-foreground size-10" aria-hidden />
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
        {hint ??
          "지도는 네이버 지도에서 확인할 수 있습니다. 아래 버튼을 눌러 검색·길찾기를 이용해 주세요."}
      </p>
    </div>
  );
}

export function PublicEventNaverMapPreview({
  locationName,
  roadAddress,
  jibunAddress,
  detailAddress,
  location,
  className,
}: {
  locationName?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  detailAddress?: string | null;
  location?: string | null;
  className?: string;
}) {
  const mapId = useId().replace(/:/g, "");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: unknown) => void;
  } | null>(null);
  const markerRef = useRef<{ setMap: (map: unknown) => void } | null>(null);

  const hasAddress = Boolean(
    roadAddress?.trim() ||
      jibunAddress?.trim() ||
      locationName?.trim() ||
      location?.trim(),
  );

  const canEmbedMap = hasAddress && isNaverMapConfigured();
  const [embedState, setEmbedState] = useState<"loading" | "ready" | "failed">(
    () => (canEmbedMap ? "loading" : "failed"),
  );

  useEffect(() => {
    if (!canEmbedMap) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadNaverMapsScript();
        if (cancelled || !mapContainerRef.current || !window.naver?.maps) {
          if (!cancelled) setEmbedState("failed");
          return;
        }

        const { coords } = await geocodeVenueWithFallback({
          locationName,
          roadAddress,
          jibunAddress,
          detailAddress,
          location,
        });

        if (cancelled || !mapContainerRef.current) return;

        const { LatLng, Map, Marker } = window.naver.maps;
        const center = new LatLng(coords.lat, coords.lng);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new Map(mapContainerRef.current, {
            center,
            zoom: 16,
          }) as { setCenter: (center: unknown) => void };
          markerRef.current = new Marker({
            position: center,
            map: mapInstanceRef.current,
          }) as { setMap: (map: unknown) => void };
        } else {
          mapInstanceRef.current.setCenter(center);
          if (markerRef.current) {
            markerRef.current.setMap(mapInstanceRef.current);
          } else {
            markerRef.current = new Marker({
              position: center,
              map: mapInstanceRef.current,
            }) as { setMap: (map: unknown) => void };
          }
        }

        if (!cancelled) setEmbedState("ready");
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[naver-map] embed failed", e);
        }
        if (!cancelled) setEmbedState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    canEmbedMap,
    locationName,
    roadAddress,
    jibunAddress,
    detailAddress,
    location,
  ]);

  if (!hasAddress) return null;

  if (!canEmbedMap || embedState === "failed") {
    return <MapPlaceholder />;
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        id={mapId}
        ref={mapContainerRef}
        className={cn(
          "h-[240px] w-full min-w-0 overflow-hidden rounded-lg border md:h-[320px]",
          embedState === "loading" && "bg-muted/30 animate-pulse",
        )}
        role="img"
        aria-label={
          [locationName, roadAddress, jibunAddress, detailAddress, location]
            .filter(Boolean)
            .join(" ") || "행사 장소 지도"
        }
      />
      {embedState === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground rounded-md bg-background/80 px-3 py-1 text-xs">
            지도 불러오는 중…
          </span>
        </div>
      ) : null}
    </div>
  );
}