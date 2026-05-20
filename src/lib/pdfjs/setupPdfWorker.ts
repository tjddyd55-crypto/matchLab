"use client";

import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

let initialized = false;

/** pdfjs worker — Next.js 클라이언트 전용 (보험 레포 setupWorker 패턴 단순화) */
export function setupPdfWorker(): void {
  if (initialized || typeof window === "undefined") return;
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
  initialized = true;
}
