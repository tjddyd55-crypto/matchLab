/**
 * Daum(카카오) 우편번호 스크립트 싱글톤 로더.
 * 여러 AddressSearchField가 있어도 script 태그는 1회만 삽입한다.
 */
const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const SCRIPT_ATTR = "data-matchon-daum-postcode";

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          buildingName?: string;
          apartment?: string;
        }) => void;
        onresize?: (size: { width: number; height: number }) => void;
        width?: string | number;
        height?: string | number;
      }) => {
        open: () => void;
        embed: (element: HTMLElement) => void;
      };
    };
  }
}

let loadPromise: Promise<void> | null = null;

export function isDaumPostcodeReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.daum?.Postcode);
}

export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window unavailable"));
  }
  if (window.daum?.Postcode) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_ATTR}]`,
    );
    if (existing) {
      if (window.daum?.Postcode) {
        resolve();
        return;
      }
      const onLoad = () => {
        cleanup();
        if (window.daum?.Postcode) resolve();
        else {
          loadPromise = null;
          reject(new Error("Daum Postcode missing after load"));
        }
      };
      const onError = () => {
        cleanup();
        loadPromise = null;
        reject(new Error("Daum Postcode script failed"));
      };
      const cleanup = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "1");
    script.onload = () => {
      if (window.daum?.Postcode) resolve();
      else {
        loadPromise = null;
        reject(new Error("Daum Postcode missing after load"));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      script.remove();
      reject(new Error("Daum Postcode script failed"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
