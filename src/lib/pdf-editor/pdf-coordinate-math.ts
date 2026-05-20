/**
 * PDF 좌표 변환 — 저장은 top-left pt, 화면은 캔버스 CSS px.
 * (보험 레포 coordinateMath 는 bottom-left 저장 — 본 프로젝트는 top-left 저장 정책)
 */

export type PdfPageSizePt = {
  widthPt: number;
  heightPt: number;
};

export type CanvasCssSize = {
  width: number;
  height: number;
};

export type StoredFieldRectPt = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasCssRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 저장(top-left pt) → 캔버스 CSS px */
export function storedRectToCanvasCss(
  rect: StoredFieldRectPt,
  page: PdfPageSizePt,
  canvas: CanvasCssSize,
): CanvasCssRect {
  if (page.widthPt <= 0 || page.heightPt <= 0 || canvas.width <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  return {
    left: round2((rect.x / page.widthPt) * canvas.width),
    top: round2((rect.y / page.heightPt) * canvas.height),
    width: round2((rect.width / page.widthPt) * canvas.width),
    height: round2((rect.height / page.heightPt) * canvas.height),
  };
}

/** 캔버스 CSS px → 저장(top-left pt) */
export function canvasCssRectToStored(
  rect: CanvasCssRect,
  page: PdfPageSizePt,
  canvas: CanvasCssSize,
): StoredFieldRectPt {
  if (canvas.width <= 0 || canvas.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: round2((rect.left / canvas.width) * page.widthPt),
    y: round2((rect.top / canvas.height) * page.heightPt),
    width: round2(Math.max(1, (rect.width / canvas.width) * page.widthPt)),
    height: round2(Math.max(1, (rect.height / canvas.height) * page.heightPt)),
  };
}

/** 드래그 pick-box: 두 코너(canvas px) → stored rect */
export function canvasPickBoxToStored(
  start: { x: number; y: number },
  end: { x: number; y: number },
  page: PdfPageSizePt,
  canvas: CanvasCssSize,
): StoredFieldRectPt {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return canvasCssRectToStored({ left, top, width, height }, page, canvas);
}
