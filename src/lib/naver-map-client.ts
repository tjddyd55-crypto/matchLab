/**
 * 네이버 Maps JavaScript API (client) — 공개 행사 안내 지도 embed 전용.
 * Client Secret은 사용하지 않습니다.
 */

export type NaverMapEmbedStatus =
  | "missing-key"
  | "script-loading"
  | "script-loaded"
  | "script-failed"
  | "naver-not-ready"
  | "geocode-running"
  | "geocode-failed"
  | "no-address"
  | "map-ready";

const NAVER_MAP_KEY =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim() ?? "")
    : "";

const NAVER_MAP_CALLBACK = "__matchLabNaverMapsReady";

let scriptLoadPromise: Promise<void> | null = null;

export function isNaverMapConfigured(): boolean {
  return NAVER_MAP_KEY.length > 0;
}

function devWarn(status: NaverMapEmbedStatus, detail?: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[naver-map] ${status}`, detail ?? "");
}

function mapsApiReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.naver?.maps?.Map &&
      window.naver?.maps?.Service?.geocode,
  );
}

function waitForGeocoderModule(timeoutMs = 15_000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("NAVER_GEOCODER_TIMEOUT"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function waitForMapsApiInit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mapsApiReady()) {
      resolve();
      return;
    }

    const maps = window.naver?.maps;
    if (!maps) {
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
      return;
    }

    const finish = () => {
      waitForGeocoderModule()
        .then(resolve)
        .catch(reject);
    };

    if (maps.jsContentLoaded === true) {
      finish();
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error("NAVER_MAP_INIT_TIMEOUT"));
    }, 15_000);

    maps.onJSContentLoaded = () => {
      window.clearTimeout(timeout);
      finish();
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

  window.navermap_authFailure ??= () => {
    devWarn("script-failed", "authentication failed (Client ID or service URL)");
  };

  scriptLoadPromise = new Promise((resolve, reject) => {
    const finishReady = () => {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      waitForMapsApiInit()
        .then(() => waitForGeocoderModule())
        .then(resolve)
        .catch(reject);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-naver-maps="true"]',
    );

    if (existing) {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      if (window.naver?.maps) {
        finishReady();
      } else {
        existing.addEventListener("load", finishReady, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("NAVER_MAP_SCRIPT_ERROR")),
          { once: true },
        );
      }
      return;
    }

    window[NAVER_MAP_CALLBACK] = () => {
      delete window[NAVER_MAP_CALLBACK];
      finishReady();
    };

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY)}&submodules=geocoder&callback=${NAVER_MAP_CALLBACK}`;
    script.async = true;
    script.dataset.naverMaps = "true";
    script.onerror = () => {
      delete window[NAVER_MAP_CALLBACK];
      reject(new Error("NAVER_MAP_SCRIPT_ERROR"));
    };
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
    if (!naver?.maps?.Service?.geocode) {
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
      return;
    }

    naver.maps.Service.geocode({ query: trimmed }, (status, response) => {
      const { Status } = naver.maps.Service;
      if (status === Status.ERROR) {
        reject(new Error("GEOCODE_FAILED"));
        return;
      }

      const totalCount = response.v2?.meta?.totalCount;
      if (typeof totalCount === "number" && totalCount === 0) {
        reject(new Error("GEOCODE_EMPTY"));
        return;
      }

      const v2First = response.v2?.addresses?.[0];
      if (v2First) {
        const lng = Number(v2First.x);
        const lat = Number(v2First.y);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resolve({ lat, lng });
          return;
        }
      }

      const legacy = response.result?.items?.[0];
      if (legacy?.point) {
        const lng = Number(legacy.point.x);
        const lat = Number(legacy.point.y);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resolve({ lat, lng });
          return;
        }
      }

      reject(new Error("GEOCODE_EMPTY"));
    });
  });
}

/** geocode 시도 순서 — 도로명 단독 최우선 */
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
      devWarn("geocode-failed", query);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("GEOCODE_FAILED");
}

declare global {
  interface Window {
    naver?: {
      maps: {
        jsContentLoaded?: boolean;
        Map: new (
          element: HTMLElement | string,
          options: { center: unknown; zoom: number },
        ) => {
          setCenter: (center: unknown) => void;
          destroy?: () => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: {
          position: unknown;
          map: unknown;
          title?: string;
        }) => {
          setMap: (map: unknown | null) => void;
        };
        onJSContentLoaded?: () => void;
        Service: {
          Status: { OK: number; ERROR: number };
          geocode: (
            opts: { query: string },
            cb: (
              status: number,
              response: {
                v2?: {
                  meta?: { totalCount?: number };
                  addresses?: Array<{ x: string; y: string }>;
                };
                result?: {
                  items?: Array<{
                    point?: { x: number; y: number };
                  }>;
                };
              },
            ) => void,
          ) => void;
        };
      };
    };
    navermap_authFailure?: () => void;
    [NAVER_MAP_CALLBACK]?: () => void;
  }
}
