/*
Adapted from internal CRM signature module. Localized for fight event platform.
Do not import directly from CRM repository. Extract to external signing service/client later when stable.
*/

"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  /** 기본 image/png */
  toBlob: () => Promise<Blob | null>;
};

type SignaturePadProps = {
  className?: string;
  ariaLabel?: string;
  hint?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className, ariaLabel, hint }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastRef = useRef<{ x: number; y: number } | null>(null);
    const hasInkRef = useRef(false);

    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.clearRect(0, 0, rect.width, rect.height);
      hasInkRef.current = false;
    }, []);

    useEffect(() => {
      const id = requestAnimationFrame(() => setupCanvas());
      return () => cancelAnimationFrame(id);
    }, [setupCanvas]);

    useImperativeHandle(ref, () => ({
      clear() {
        setupCanvas();
        lastRef.current = null;
      },
      isEmpty() {
        return !hasInkRef.current;
      },
      async toBlob() {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png"),
        );
      },
    }));

    const pointerPos = useCallback(
      (ev: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
        };
      },
      [],
    );

    function handlePointerDown(ev: React.PointerEvent<HTMLCanvasElement>) {
      ev.preventDefault();
      drawingRef.current = true;
      lastRef.current = pointerPos(ev);
      canvasRef.current?.setPointerCapture(ev.pointerId);
    }

    function handlePointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const last = lastRef.current;
      if (!canvas || !ctx || !last) return;
      const next = pointerPos(ev);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      lastRef.current = next;
      hasInkRef.current = true;
    }

    function handlePointerUp(ev: React.PointerEvent<HTMLCanvasElement>) {
      drawingRef.current = false;
      lastRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(ev.pointerId);
      } catch {
        /* noop */
      }
    }

    return (
      <div className={className}>
        <p className="text-muted-foreground mb-2 text-xs leading-relaxed">
          {hint ??
            "터치펜·손가락으로 서명란에 그려 주세요. 서명 내용은 제출할 때까지 기기에만 남습니다."}
        </p>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel ?? "서명 패드"}
          className="touch-none border-input bg-background h-40 w-full rounded-md border md:h-44"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    );
  },
);
