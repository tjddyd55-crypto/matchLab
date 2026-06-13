/**
 * 네이버 Maps JavaScript API (client) — 공개 행사 안내 지도 embed 전용.
 * 좌표 변환은 서버 Geocoding API에서 처리합니다. Client Secret은 사용하지 않습니다.
 */

export type NaverMapEmbedStatus =
  | "missing-key"
  | "script-loading"
  | "script-loaded"
  | "callback-called"
  | "naver-ready"
  | "script-load-failed"
  | "naver-not-ready"
  | "auth-failed-or-domain-not-allowed"
  | "timeout"
  | "no-coords"
  | "map-ready";

const NAVER_MAP_KEY =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim() ?? "")
    : "";

/** maps.js callback query — script append 전에 window에 반드시 등록 */
export const NAVER_MAP_CALLBACK = "__matchLabNaverMapsReady";

const MAPS_SCRIPT_SELECTOR = 'script[data-naver-maps="true"]';
const NAVER_POLL_INTERVAL_MS = 50;
const NAVER_READY_TIMEOUT_MS = 15_000;

let scriptLoadPromise: Promise<void> | null = null;

export class NaverMapLoadError extends Error {
  readonly status: NaverMapEmbedStatus;

  constructor(status: NaverMapEmbedStatus, cause?: unknown) {
    super(status);
    this.name = "NaverMapLoadError";
    this.status = status;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

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

function resetScriptLoadPromise(): void {
  scriptLoadPromise = null;
}

function ensureAuthFailureHandler(onAuthFailure: () => void): void {
  window.navermap_authFailure = () => {
    devWarn("auth-failed-or-domain-not-allowed");
    onAuthFailure();
  };
}

/**
 * callback=__matchLabNaverMapsReady 파라미터와 쌍으로 동작합니다.
 * script append 전에 호출해야 합니다.
 */
function registerMapsReadyCallback(onCalled: () => void): void {
  window.__matchLabNaverMapsReady = () => {
    devWarn("callback-called");
    onCalled();
  };
}

function pollUntilMapsApiReady(
  timeoutMs = NAVER_READY_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new NaverMapLoadError("timeout"));
        return;
      }
      window.setTimeout(tick, NAVER_POLL_INTERVAL_MS);
    };

    tick();
  });
}

function waitForMapsAfterCallback(): Promise<void> {
  return pollUntilMapsApiReady().catch((e) => {
    if (e instanceof NaverMapLoadError && e.status === "timeout") {
      throw new NaverMapLoadError("naver-not-ready", e);
    }
    throw e;
  });
}

function buildMapsScriptUrl(): string {
  return `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY)}&callback=${NAVER_MAP_CALLBACK}`;
}

export function loadNaverMapsScript(): Promise<void> {
  if (!NAVER_MAP_KEY) {
    return Promise.reject(new NaverMapLoadError("missing-key"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new NaverMapLoadError("script-load-failed"));
  }

  if (mapsApiReady()) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    let settled = false;

    const settleResolve = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const settleReject = (status: NaverMapEmbedStatus, cause?: unknown) => {
      if (settled) return;
      settled = true;
      resetScriptLoadPromise();
      reject(new NaverMapLoadError(status, cause));
    };

    const onNaverReady = () => {
      devWarn("naver-ready");
      settleResolve();
    };

    const onCallbackCalled = () => {
      waitForMapsAfterCallback().then(onNaverReady).catch((e) => {
        if (e instanceof NaverMapLoadError) {
          settleReject(e.status, e);
        } else {
          settleReject("naver-not-ready", e);
        }
      });
    };

    ensureAuthFailureHandler(() => {
      settleReject("auth-failed-or-domain-not-allowed");
    });

    // callback 파라미터가 있는 script URL — append 전 반드시 선등록
    registerMapsReadyCallback(onCallbackCalled);

    const existing = document.querySelector<HTMLScriptElement>(
      MAPS_SCRIPT_SELECTOR,
    );

    if (existing) {
      if (mapsApiReady()) {
        onNaverReady();
        return;
      }

      // callback은 이미 등록됨 — 기존 script 로드 완료 또는 naver polling
      if (window.naver?.maps) {
        onCallbackCalled();
        return;
      }

      existing.addEventListener(
        "load",
        () => {
          devWarn("script-loaded");
          onCallbackCalled();
        },
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => settleReject("script-load-failed"),
        { once: true },
      );

      pollUntilMapsApiReady()
        .then(onNaverReady)
        .catch((e) => {
          if (e instanceof NaverMapLoadError) {
            settleReject(e.status, e);
          } else {
            settleReject("naver-not-ready", e);
          }
        });
      return;
    }

    devWarn("script-loading");

    const script = document.createElement("script");
    script.src = buildMapsScriptUrl();
    script.async = true;
    script.dataset.naverMaps = "true";
    script.addEventListener(
      "load",
      () => {
        devWarn("script-loaded");
        // callback이 호출되지 않은 경우(드물게) polling fallback
        if (!mapsApiReady()) {
          onCallbackCalled();
        }
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        devWarn("script-load-failed");
        settleReject("script-load-failed");
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return scriptLoadPromise.catch((e) => {
    resetScriptLoadPromise();
    throw e;
  });
}

export type NaverMapCoords = { lat: number; lng: number };

declare global {
  interface Window {
    __matchLabNaverMapsReady?: () => void;
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
  }
}
