"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import type { ApplicationPdfField } from "@/lib/pdf-editor/application-pdf-field";
import {
  canvasPickBoxToStored,
  type CanvasCssSize,
  type PdfPageSizePt,
} from "@/lib/pdf-editor/pdf-coordinate-math";
import { PdfOverlayFieldBox } from "@/components/domain/application-form-templates/pdf-editor/PdfOverlayFieldBox";
import { getPdfJsCmapAndStandardFontUrls } from "@/lib/pdfjs/pdfDocumentInitParams";
import { setupPdfWorker } from "@/lib/pdfjs/setupPdfWorker";

setupPdfWorker();

const MIN_PICK_PX = 6;

export function PdfPageCanvas({
  pdfBytes,
  pageIndex,
  fields,
  selectedFieldId,
  pickMode,
  pendingFieldType,
  onSelectField,
  onFieldRectChange,
  onPickComplete,
  onPageMeta,
}: {
  pdfBytes: ArrayBuffer | null;
  pageIndex: number;
  fields: ApplicationPdfField[];
  selectedFieldId: string | null;
  pickMode: boolean;
  pendingFieldType: ApplicationPdfField["type"] | null;
  onSelectField: (id: string | null) => void;
  onFieldRectChange: (
    id: string,
    rect: Pick<ApplicationPdfField, "x" | "y" | "width" | "height">,
  ) => void;
  onPickComplete: (
    rect: Pick<ApplicationPdfField, "x" | "y" | "width" | "height">,
    page: number,
  ) => void;
  onPageMeta?: (meta: { pageCount: number; pageSizePt: PdfPageSizePt }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageSizePt, setPageSizePt] = useState<PdfPageSizePt | null>(null);
  const [canvasCssSize, setCanvasCssSize] = useState<CanvasCssSize>({
    width: 0,
    height: 0,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const pickRef = useRef<{ x: number; y: number } | null>(null);
  const [draftBox, setDraftBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const pageFields = fields.filter((f) => f.page === pageIndex + 1);

  useEffect(() => {
    if (!pdfBytes) {
      queueMicrotask(() => {
        setStatus("idle");
        setPageSizePt(null);
        setCanvasCssSize({ width: 0, height: 0 });
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setStatus("loading"));

    void (async () => {
      try {
        const cmap = getPdfJsCmapAndStandardFontUrls();
        const pdf: PDFDocumentProxy = await getDocument({
          data: pdfBytes.slice(0),
          ...cmap,
          cMapPacked: true,
        }).promise;
        if (cancelled) {
          void pdf.destroy();
          return;
        }

        const numPages = pdf.numPages;

        const page = await pdf.getPage(pageIndex + 1);
        const base = page.getViewport({ scale: 1 });
        const nextPageSize = {
          widthPt: base.width,
          heightPt: base.height,
        };
        setPageSizePt(nextPageSize);
        onPageMeta?.({
          pageCount: numPages,
          pageSizePt: nextPageSize,
        });

        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas || cancelled) return;

        const maxW = Math.min(900, Math.max(320, wrap.clientWidth || 640));
        const scale = maxW / base.width;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setCanvasCssSize({
          width: viewport.width,
          height: viewport.height,
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setStatus("error");
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        if (!cancelled) setStatus("ready");
        void pdf.destroy();
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageIndex, onPageMeta]);

  const relativePoint = useCallback((e: ReactPointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const onOverlayPointerDown = (e: ReactPointerEvent) => {
    if (!pickMode && !pendingFieldType) {
      onSelectField(null);
      return;
    }
    if (!pickMode && !pendingFieldType) return;
    const p = relativePoint(e);
    pickRef.current = p;
    setDraftBox({ left: p.x, top: p.y, width: 0, height: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onOverlayPointerMove = (e: ReactPointerEvent) => {
    const start = pickRef.current;
    if (!start) return;
    const p = relativePoint(e);
    setDraftBox({
      left: Math.min(start.x, p.x),
      top: Math.min(start.y, p.y),
      width: Math.abs(p.x - start.x),
      height: Math.abs(p.y - start.y),
    });
  };

  const onOverlayPointerUp = (e: ReactPointerEvent) => {
    const start = pickRef.current;
    pickRef.current = null;
    setDraftBox(null);
    if (!start) return;

    const p = relativePoint(e);
    const w = Math.abs(p.x - start.x);
    const h = Math.abs(p.y - start.y);
    if (w < MIN_PICK_PX || h < MIN_PICK_PX) return;

    const pageSize = pageSizePt;
    if (!pageSize || canvasCssSize.width <= 0) return;

    const stored = canvasPickBoxToStored(start, p, pageSize, canvasCssSize);
    onPickComplete(stored, pageIndex + 1);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-auto rounded-lg border bg-muted/30">
      {status === "loading" ? (
        <p className="text-muted-foreground p-8 text-sm">PDF 렌더링 중…</p>
      ) : null}
      {status === "error" ? (
        <p className="text-destructive p-8 text-sm" role="alert">
          PDF를 표시하지 못했습니다. 파일을 다시 업로드해 주세요.
        </p>
      ) : null}
      <div className="relative inline-block">
        <canvas ref={canvasRef} className="block max-w-full" />
        {status === "ready" && pageSizePt && canvasCssSize.width > 0 ? (
          <div
            className="absolute inset-0"
            style={{
              width: canvasCssSize.width,
              height: canvasCssSize.height,
            }}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onOverlayPointerMove}
            onPointerUp={onOverlayPointerUp}
          >
            {pageFields.map((f) => (
              <PdfOverlayFieldBox
                key={f.id}
                field={f}
                selected={f.id === selectedFieldId}
                pageSizePt={pageSizePt}
                canvasCssSize={canvasCssSize}
                onSelect={() => onSelectField(f.id)}
                onRectChange={(rect) => onFieldRectChange(f.id, rect)}
              />
            ))}
            {draftBox ? (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-red-500 bg-red-500/10"
                style={draftBox}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
