"use client";

import { useCallback, useRef } from "react";
import type { ApplicationPdfField } from "@/lib/pdf-editor/application-pdf-field";
import {
  canvasCssRectToStored,
  storedRectToCanvasCss,
  type CanvasCssSize,
  type PdfPageSizePt,
} from "@/lib/pdf-editor/pdf-coordinate-math";
import { cn } from "@/lib/utils";

type DragMode = "move" | "resize-se" | null;

export function PdfOverlayFieldBox({
  field,
  selected,
  pageSizePt,
  canvasCssSize,
  onSelect,
  onRectChange,
}: {
  field: ApplicationPdfField;
  selected: boolean;
  pageSizePt: PdfPageSizePt;
  canvasCssSize: CanvasCssSize;
  onSelect: () => void;
  onRectChange: (rect: Pick<ApplicationPdfField, "x" | "y" | "width" | "height">) => void;
}) {
  const css = storedRectToCanvasCss(field, pageSizePt, canvasCssSize);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origin: typeof css;
  } | null>(null);

  const onPointerDown = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect();
      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { ...css },
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [css, onSelect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      let next = { ...d.origin };
      if (d.mode === "move") {
        next = {
          ...next,
          left: d.origin.left + dx,
          top: d.origin.top + dy,
        };
      } else if (d.mode === "resize-se") {
        next = {
          ...next,
          width: Math.max(8, d.origin.width + dx),
          height: Math.max(8, d.origin.height + dy),
        };
      }
      const stored = canvasCssRectToStored(next, pageSizePt, canvasCssSize);
      onRectChange(stored);
    },
    [canvasCssSize, onRectChange, pageSizePt],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "absolute box-border cursor-move border-2 text-[10px] leading-tight",
        selected
          ? "border-red-500 bg-red-500/15"
          : "border-sky-500 bg-sky-500/10 hover:border-sky-600",
      )}
      style={{
        left: css.left,
        top: css.top,
        width: css.width,
        height: css.height,
      }}
      onPointerDown={onPointerDown("move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <span className="pointer-events-none absolute -top-5 left-0 max-w-[140px] truncate rounded bg-slate-900/85 px-1 py-0.5 text-white">
        {field.label}
      </span>
      <div
        className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize bg-red-500/80"
        onPointerDown={onPointerDown("resize-se")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
