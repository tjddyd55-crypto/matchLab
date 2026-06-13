"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  isNaverMapConfigured,
  loadNaverMapsScript,
  NaverMapLoadError,
  type NaverMapEmbedStatus,
} from "@/lib/naver-map-client";
import { cn } from "@/lib/utils";

const FALLBACK_HINT =
  "지도는 네이버 지도에서 확인할 수 있습니다. 아래 버튼을 눌러 검색·길찾기를 이용해 주세요.";

function MapPlaceholder({ hint }: { hint?: string }) {
  return (
    <div className="bg-muted/30 flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center md:min-h-[320px]">
      <MapPin className="text-muted-foreground size-10" aria-hidden />
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
        {hint ?? FALLBACK_HINT}
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
        reject(new NaverMapLoadError("naver-not-ready"));
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

function resolveLoadFailureStatus(error: unknown): NaverMapEmbedStatus {
  if (error instanceof NaverMapLoadError) return error.status;
  return "script-load-failed";
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
  const [mapStatus, setMapStatus] = useState<NaverMapEmbedStatus>(() =>
    !coordsReady ? "no-coords" : canEmbedMap ? "script-loading" : "missing-key",
  );
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    if (!canEmbedMap || !coordsReady) return;

    let cancelled = false;
    const mapLat = lat as number;
    const mapLng = lng as number;

    void (async () => {
      setEmbedState("loading");
      setMapStatus("script-loading");
      setErrorReason(null);

      try {
        await loadNaverMapsScript();
        if (cancelled) return;

        setMapStatus("naver-ready");

        const container = await waitForMapContainer(
          () => mapContainerRef.current,
        );
        if (cancelled) return;

        if (!window.naver?.maps?.Map) {
          throw new NaverMapLoadError("naver-not-ready");
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
          setMapStatus("map-ready");
          setErrorReason(null);
        }
      } catch (e) {
        const status = resolveLoadFailureStatus(e);
        if (process.env.NODE_ENV === "development") {
          console.warn("[naver-map] embed failed", status, e);
        } else {
          console.warn("[naver-map] embed failed", status);
        }
        if (!cancelled) {
          setEmbedState("failed");
          setMapStatus(status);
          setErrorReason(status);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEmbedMap, coordsReady, lat, lng, markerTitle]);

  if (!coordsReady) {
    return <MapPlaceholder />;
  }

  if (!canEmbedMap) {
    return (
      <MapPlaceholder hint="지도 API 키가 설정되지 않았습니다. 배포 환경에 NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID를 추가한 뒤 앱을 다시 빌드·배포해 주세요." />
    );
  }

  const showFallbackOverlay = embedState === "failed";

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        id={mapId}
        ref={mapContainerRef}
        data-map-status={mapStatus}
        data-map-error-reason={errorReason ?? undefined}
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
      {showFallbackOverlay ? (
        <div className="absolute inset-0">
          <MapPlaceholder />
        </div>
      ) : null}
    </div>
  );
}
