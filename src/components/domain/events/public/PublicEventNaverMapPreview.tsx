"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  isNaverMapConfigured,
  loadNaverMapsScript,
  type NaverMapEmbedStatus,
} from "@/lib/naver-map-client";
import { cn } from "@/lib/utils";

function MapPlaceholder({ hint }: { hint?: string }) {
  return (
    <div className="bg-muted/30 flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center md:min-h-[320px]">
      <MapPin className="text-muted-foreground size-10" aria-hidden />
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
        {hint ??
          "지도는 네이버 지도에서 확인할 수 있습니다. 아래 버튼을 눌러 검색·길찾기를 이용해 주세요."}
      </p>
    </div>
  );
}

function waitForMapContainer(
  getContainer: () => HTMLDivElement | null,
): Promise<HTMLDivElement> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const container = getContainer();
      if (container) {
        resolve(container);
        return;
      }
      if (Date.now() - started >= 5_000) {
        reject(new Error("MAP_CONTAINER_MISSING"));
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function hasValidCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export function PublicEventNaverMapPreview({
  lat,
  lng,
  markerTitle,
  className,
}: {
  lat?: number | null;
  lng?: number | null;
  markerTitle?: string | null;
  className?: string;
}) {
  const mapId = useId().replace(/:/g, "");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: unknown) => void;
  } | null>(null);
  const markerRef = useRef<{ setMap: (map: unknown) => void } | null>(null);

  const coordsReady = hasValidCoords(lat, lng);
  const canEmbedMap = coordsReady && isNaverMapConfigured();

  const [embedState, setEmbedState] = useState<"loading" | "ready" | "failed">(
    () => (canEmbedMap ? "loading" : "failed"),
  );
  const [debugStatus, setDebugStatus] = useState<NaverMapEmbedStatus | "idle">(
    () =>
      !coordsReady
        ? "no-coords"
        : canEmbedMap
          ? "script-loading"
          : "missing-key",
  );

  useEffect(() => {
    if (!canEmbedMap || !coordsReady) return;

    let cancelled = false;
    const mapLat = lat as number;
    const mapLng = lng as number;

    void (async () => {
      setEmbedState("loading");
      setDebugStatus("script-loading");

      try {
        await loadNaverMapsScript();
        if (cancelled) return;

        setDebugStatus("script-loaded");
        const container = await waitForMapContainer(
          () => mapContainerRef.current,
        );
        if (cancelled) return;

        if (!window.naver?.maps?.Map) {
          setDebugStatus("naver-not-ready");
          throw new Error("NAVER_MAP_UNAVAILABLE");
        }

        await waitForLayout();
        if (cancelled) return;

        const { LatLng, Map, Marker } = window.naver.maps;
        const center = new LatLng(mapLat, mapLng);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new Map(container, {
            center,
            zoom: 16,
          }) as { setCenter: (center: unknown) => void };
          markerRef.current = new Marker({
            position: center,
            map: mapInstanceRef.current,
            title: markerTitle?.trim() || undefined,
          }) as { setMap: (map: unknown) => void };
        } else {
          mapInstanceRef.current.setCenter(center);
          if (markerRef.current) {
            markerRef.current.setMap(mapInstanceRef.current);
          } else {
            markerRef.current = new Marker({
              position: center,
              map: mapInstanceRef.current,
              title: markerTitle?.trim() || undefined,
            }) as { setMap: (map: unknown) => void };
          }
        }

        if (!cancelled) {
          setEmbedState("ready");
          setDebugStatus("map-ready");
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[naver-map] embed failed", e);
        }
        if (!cancelled) {
          setEmbedState("failed");
          setDebugStatus("script-failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEmbedMap, coordsReady, lat, lng, markerTitle]);

  if (!coordsReady && !isNaverMapConfigured()) {
    return <MapPlaceholder />;
  }

  if (!coordsReady) {
    return <MapPlaceholder />;
  }

  const mapStatusAttr =
    process.env.NODE_ENV === "development" ? debugStatus : undefined;

  if (!canEmbedMap) {
    return (
      <MapPlaceholder hint="지도 API 키가 설정되지 않았습니다. 배포 환경에 NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID를 추가한 뒤 앱을 다시 빌드·배포해 주세요." />
    );
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        id={mapId}
        ref={mapContainerRef}
        data-map-status={mapStatusAttr}
        className={cn(
          "h-[240px] w-full min-w-0 overflow-hidden rounded-lg border md:h-[320px]",
          embedState !== "ready" && "bg-muted/30",
        )}
        role="img"
        aria-hidden={embedState !== "ready"}
        aria-label={
          embedState === "ready"
            ? markerTitle?.trim() || "행사 장소 지도"
            : undefined
        }
      />
      {embedState === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground rounded-md bg-background/80 px-3 py-1 text-xs">
            지도 불러오는 중…
          </span>
        </div>
      ) : null}
      {embedState === "failed" ? (
        <div className="absolute inset-0">
          <MapPlaceholder />
        </div>
      ) : null}
    </div>
  );
}
