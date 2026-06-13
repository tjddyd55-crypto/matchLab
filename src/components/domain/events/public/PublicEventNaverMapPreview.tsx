"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";
import { buildMapSearchQuery, buildMapSearchUrl } from "@/lib/event-public-display";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: {
            center: unknown;
            zoom: number;
          },
        ) => {
          setCenter: (center: unknown) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { position: unknown; map: unknown }) => unknown;
        Service: {
          Status: { OK: string; ERROR: string };
          geocode: (
            opts: { query: string },
            cb: (
              status: string,
              response: {
                v2: {
                  addresses: Array<{ x: string; y: string }>;
                };
              },
            ) => void,
          ) => void;
        };
      };
    };
  }
}

const NAVER_MAP_KEY = process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim() ?? "";

let naverScriptPromise: Promise<void> | null = null;

function loadNaverMapsScript(): Promise<void> {
  if (!NAVER_MAP_KEY) {
    return Promise.reject(new Error("NAVER_MAP_KEY_MISSING"));
  }
  if (typeof window !== "undefined" && window.naver?.maps) {
    return Promise.resolve();
  }
  if (naverScriptPromise) return naverScriptPromise;

  naverScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-naver-maps="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("NAVER_MAP_SCRIPT_ERROR")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY)}&submodules=geocoder`;
    script.async = true;
    script.dataset.naverMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("NAVER_MAP_SCRIPT_ERROR"));
    document.head.appendChild(script);
  });

  return naverScriptPromise;
}

function geocodeAddress(query: string): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    const naver = window.naver;
    if (!naver?.maps?.Service) {
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
      return;
    }

    naver.maps.Service.geocode({ query }, (status, response) => {
      if (status !== naver.maps.Service.Status.OK) {
        reject(new Error("GEOCODE_FAILED"));
        return;
      }
      const first = response.v2.addresses[0];
      if (!first) {
        reject(new Error("GEOCODE_EMPTY"));
        return;
      }
      const lng = Number(first.x);
      const lat = Number(first.y);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        reject(new Error("GEOCODE_INVALID"));
        return;
      }
      resolve({ lat, lng });
    });
  });
}

function MapPlaceholder({
  mapHref,
  locationName,
  roadAddress,
  location,
  hint,
}: {
  mapHref: string | null;
  locationName?: string | null;
  roadAddress?: string | null;
  location?: string | null;
  hint?: string;
}) {
  return (
    <div className="bg-muted/30 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center md:min-h-[280px]">
      <MapPin className="text-muted-foreground size-10" aria-hidden />
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
        {hint ??
          "지도는 네이버 지도에서 확인할 수 있습니다. 아래 버튼을 눌러 검색·길찾기를 이용해 주세요."}
      </p>
      {mapHref ? (
        <PublicEventMapLink
          locationName={locationName}
          roadAddress={roadAddress}
          location={location}
        />
      ) : null}
    </div>
  );
}

export function PublicEventNaverMapPreview({
  locationName,
  roadAddress,
  detailAddress,
  location,
  className,
}: {
  locationName?: string | null;
  roadAddress?: string | null;
  detailAddress?: string | null;
  location?: string | null;
  className?: string;
}) {
  const mapId = useId().replace(/:/g, "");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: unknown) => void;
  } | null>(null);
  const markerRef = useRef<unknown>(null);

  const query = buildMapSearchQuery({ locationName, roadAddress, location });
  const mapHref = buildMapSearchUrl({ locationName, roadAddress, location });
  const canEmbedMap = Boolean(query && NAVER_MAP_KEY);
  const [embedState, setEmbedState] = useState<"loading" | "ready" | "failed">(
    "loading",
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

        const coords = await geocodeAddress(query!);
        if (cancelled || !mapContainerRef.current) return;

        const { LatLng, Map, Marker } = window.naver.maps;
        const center = new LatLng(coords.lat, coords.lng);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new Map(mapContainerRef.current, {
            center,
            zoom: 16,
          });
          markerRef.current = new Marker({
            position: center,
            map: mapInstanceRef.current,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          markerRef.current = new Marker({
            position: center,
            map: mapInstanceRef.current,
          });
        }

        if (!cancelled) setEmbedState("ready");
      } catch {
        if (!cancelled) setEmbedState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEmbedMap, query]);

  if (!query) return null;

  if (!canEmbedMap || embedState === "failed") {
    return (
      <MapPlaceholder
        mapHref={mapHref}
        locationName={locationName}
        roadAddress={roadAddress}
        location={location}
        hint={
          NAVER_MAP_KEY
            ? "지도를 불러오지 못했습니다. 네이버 지도에서 확인해 주세요."
            : undefined
        }
      />
    );
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        id={mapId}
        ref={mapContainerRef}
        className={cn(
          "h-[220px] w-full min-w-0 overflow-hidden rounded-lg border md:h-[320px]",
          embedState === "loading" && "bg-muted/30 animate-pulse",
        )}
        role="img"
        aria-label={
          [locationName, roadAddress, detailAddress, location]
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
      <div className="mt-3 flex justify-end">
        <PublicEventMapLink
          locationName={locationName}
          roadAddress={roadAddress}
          location={location}
          compact
        />
      </div>
    </div>
  );
}
