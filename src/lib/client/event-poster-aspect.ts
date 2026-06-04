/** 인스타 피드형 4:5 (권장 1080×1350px) */
export const EVENT_POSTER_TARGET_ASPECT = 4 / 5;

/** 비율 허용 오차 (약 1.5% — 1080×1350 등 미세 픽셀 차이 허용) */
export const EVENT_POSTER_ASPECT_TOLERANCE = 0.015;

export const EVENT_POSTER_ASPECT_MISMATCH_WARNING =
  "현재 이미지 비율이 4:5가 아닙니다. 카드에서 여백이 생길 수 있습니다. 1080 x 1350px 포스터를 권장합니다.";

export function isEventPosterFourFiveAspect(
  width: number,
  height: number,
): boolean {
  if (width < 1 || height < 1) return false;
  const ratio = width / height;
  return (
    Math.abs(ratio - EVENT_POSTER_TARGET_ASPECT) <= EVENT_POSTER_ASPECT_TOLERANCE
  );
}

export function getEventPosterAspectWarning(
  width: number,
  height: number,
): string | null {
  return isEventPosterFourFiveAspect(width, height)
    ? null
    : EVENT_POSTER_ASPECT_MISMATCH_WARNING;
}

export function readImageDimensionsFromFile(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 크기를 읽을 수 없습니다."));
    };
    img.src = url;
  });
}

export function readImageDimensionsFromUrl(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error("이미지 크기를 읽을 수 없습니다."));
    };
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}
