/**
 * 네이버 Maps JavaScript API (client) — 공개 행사 안내 지도 embed 전용.
 * 좌표 변환은 서버 Geocoding API에서 처리합니다. Client Secret은 사용하지 않습니다.
 */

export type NaverMapEmbedStatus =
  | "missing-key"
  | "script-loading"
  | "script-loaded"
  | "script-failed"
  | "naver-not-ready"
  | "no-coords"
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
      window.naver?.maps?.LatLng &&
      window.naver?.maps?.Marker,
  );
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
      if (mapsApiReady()) {
        resolve();
        return;
      }
      reject(new Error("NAVER_MAP_UNAVAILABLE"));
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
      waitForMapsApiInit().then(resolve).catch(reject);
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
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY)}&callback=${NAVER_MAP_CALLBACK}`;
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
      };
    };
    navermap_authFailure?: () => void;
    [NAVER_MAP_CALLBACK]?: () => void;
  }
}
