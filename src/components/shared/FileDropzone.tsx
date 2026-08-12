"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  accept = ".xlsx",
  maxBytes,
  disabled = false,
  busy = false,
  file = null,
  error = null,
  onFile,
  onClear,
  onReject,
  title = "Excel 파일을 여기에 놓거나",
  mobileTitle = "Excel 파일 업로드",
  hint,
  className,
}: {
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  busy?: boolean;
  file?: File | null;
  error?: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  onReject?: (message: string) => void;
  title?: string;
  mobileTitle?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const blocked = disabled || busy;

  function openPicker() {
    if (blocked) return;
    inputRef.current?.click();
  }

  function reject(message: string) {
    onReject?.(message);
  }

  function validateAndEmit(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (list.length > 1) {
      reject("1개의 Excel 파일만 업로드할 수 있습니다.");
      return;
    }
    const selected = list[0]!;
    const name = selected.name.toLowerCase();
    const acceptTokens = accept
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const okExt = acceptTokens.some((token) => {
      if (token.startsWith(".")) return name.endsWith(token);
      return selected.type === token;
    });
    if (!okExt) {
      reject("지원하지 않는 파일입니다. .xlsx 파일을 선택해주세요.");
      return;
    }
    if (typeof maxBytes === "number" && selected.size > maxBytes) {
      reject(
        `파일 크기는 최대 ${Math.round(maxBytes / (1024 * 1024))}MB까지 가능합니다.`,
      );
      return;
    }
    onFile(selected);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) return;
    setDragOver(true);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) return;
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (blocked) return;
    validateAndEmit(e.dataTransfer.files);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={blocked}
        onChange={(e) => {
          const selected = e.target.files;
          if (selected?.length) validateAndEmit(selected);
          e.target.value = "";
        }}
      />

      {file ? (
        <div
          className={cn(
            "rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-4",
            busy && "opacity-80",
          )}
        >
          <p className="truncate text-sm font-medium text-[#0F172A]">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            {busy ? "파일 분석 중…" : formatBytes(file.size)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={blocked}
              onClick={openPicker}
            >
              다른 파일 선택
            </Button>
            {onClear ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={blocked}
                onClick={onClear}
              >
                삭제
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={blocked ? -1 : 0}
          aria-disabled={blocked}
          aria-label="Excel 파일 업로드"
          onClick={openPicker}
          onKeyDown={onKeyDown}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]/30",
            dragOver
              ? "border-[#0A47FF] bg-[#EFF4FF]"
              : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#94A3B8]",
            blocked && "cursor-not-allowed opacity-60",
            error && "border-red-300 bg-red-50/40",
          )}
        >
          <p className="text-sm font-medium text-[#0F172A] md:hidden">
            {mobileTitle}
          </p>
          <p className="hidden text-sm font-medium text-[#0F172A] md:block">
            {title}
          </p>
          <p className="text-xs text-[#64748B] md:hidden">
            파일을 선택해 업로드하세요
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-w-[7.5rem] md:h-9"
            disabled={blocked}
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            파일 선택
          </Button>
          {hint ? (
            <p className="text-[11px] leading-snug text-[#64748B]">{hint}</p>
          ) : null}
          <p className="hidden text-[11px] text-[#94A3B8] md:block">
            드래그 앤 드롭도 가능합니다
          </p>
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
