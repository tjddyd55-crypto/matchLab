/**
 * 네이버 Maps JavaScript API (client) — 공개 행사 안내 지도 embed 전용.
 * Client Secret은 사용하지 않습니다.
 */

const NAVER_MAP_KEY =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim() ?? "")
    : "";

let scriptLoadPromise: Promise<void> | null = null;

export function getNaverMapClientId(): string {
  return NAVER_MAP_KEY;
}

export function isNaverMapConfigured(): boolean {
  return NAVER_MAP_KEY.length > 0;
}

function mapsApiReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.naver?.maps?.Map &&
      window.naver?.maps?.Service,
  );
}

function waitForMapsApiInit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mapsApiReady()) {
      resolve();
      return;
    }

    const naverMaps = window.naver?.maps;
    if (!naverMaps) {
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error("NAVER_MAP_INIT_TIMEOUT"));
    }, 15_000);

    naverMaps.onJSContentLoaded = () => {
      window.clearTimeout(timeout);
      if (mapsApiReady()) resolve();
      else reject(new Error("NAVER_MAP_UNAVAILABLE"));
    };
  });
}

export function loadNaverMapsScript(): Promise<void> {
  if (!NAVER_MAP_KEY) {
    return Promise.reject(new Error("NAVER_MAP_KEY_MISSING"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("NAVER_MAP_SSR"));
  }

  if (mapsApiReady()) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) return scriptLoadPromise;

  if (typeof window.navermap_authFailure !== "function") {
    window.navermap_authFailure = () => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[naver-map] Authentication failed — check NCP Client ID and service URL allowlist.",
        );
      }
    };
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-naver-maps="true"]',
    );

    const afterScriptLoaded = () => {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      waitForMapsApiInit().then(resolve).catch(reject);
    };

    if (existing) {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      if (window.naver?.maps) {
        waitForMapsApiInit().then(resolve).catch(reject);
      } else {
        existing.addEventListener("load", afterScriptLoaded, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("NAVER_MAP_SCRIPT_ERROR")),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY)}&submodules=geocoder`;
    script.async = true;
    script.dataset.naverMaps = "true";
    script.onload = afterScriptLoaded;
    script.onerror = () => reject(new Error("NAVER_MAP_SCRIPT_ERROR"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export type NaverMapCoords = { lat: number; lng: number };

export function geocodeWithNaver(query: string): Promise<NaverMapCoords> {
  const trimmed = query.trim();
  if (!trimmed) {
    return Promise.reject(new Error("GEOCODE_EMPTY_QUERY"));
  }

  return new Promise((resolve, reject) => {
    const naver = window.naver;
    if (!naver?.maps?.Service) {
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
      return;
    }

    naver.maps.Service.geocode({ query: trimmed }, (status, response) => {
      const ok = naver.maps.Service.Status.OK;
      if (status !== ok) {
        reject(new Error("GEOCODE_FAILED"));
        return;
      }

      const first = response.v2?.addresses?.[0];
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

/** geocode 시도 순서 — 도로명 단독을 최우선 */
export function buildGeocodeQueries(input: {
  locationName?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  detailAddress?: string | null;
  location?: string | null;
}): string[] {
  const name = input.locationName?.trim();
  const road = input.roadAddress?.trim();
  const jibun = input.jibunAddress?.trim();
  const detail = input.detailAddress?.trim();
  const loc = input.location?.trim();

  const queries: string[] = [];
  const push = (q: string | undefined) => {
    const t = q?.trim();
    if (t && !queries.includes(t)) queries.push(t);
  };

  push(road);
  if (road && detail) push(`${road} ${detail}`);
  push(jibun);
  if (name && road) push(`${name} ${road}`);
  push(name);
  push(loc);

  return queries;
}

export async function geocodeVenueWithFallback(input: {
  locationName?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  detailAddress?: string | null;
  location?: string | null;
}): Promise<{ coords: NaverMapCoords; query: string }> {
  const queries = buildGeocodeQueries(input);
  if (queries.length === 0) {
    throw new Error("GEOCODE_NO_ADDRESS");
  }

  let lastError: unknown;
  for (const query of queries) {
    try {
      const coords = await geocodeWithNaver(query);
      return { coords, query };
    } catch (e) {
      lastError = e;
      if (process.env.NODE_ENV === "development") {
        console.warn(`[naver-map] geocode failed for "${query}"`, e);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("GEOCODE_FAILED");
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: { center: unknown; zoom: number },
        ) => {
          setCenter: (center: unknown) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { position: unknown; map: unknown }) => unknown;
        onJSContentLoaded?: () => void;
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
    navermap_authFailure?: () => void;
  }
}
