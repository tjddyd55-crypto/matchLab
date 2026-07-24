"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentUploadStatus =
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "error";

export type DocumentUploadValue = {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
} | null;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function statusMessage(status: DocumentUploadStatus): string | null {
  switch (status) {
    case "selected":
      return "업로드할 파일이 선택되었습니다.";
    case "uploading":
      return "파일을 업로드하고 있습니다.";
    case "uploaded":
      return "첨부가 완료되었습니다.";
    case "error":
      return null;
    default:
      return null;
  }
}

export function DocumentUploadField({
  label,
  description,
  required,
  accept,
  acceptHint,
  maxSizeHint,
  value,
  status = "idle",
  error,
  disabled,
  onSelect,
  onRemove,
  className,
}: {
  label: string;
  description?: string;
  required?: boolean;
  accept: string;
  acceptHint?: string;
  maxSizeHint?: string;
  value: DocumentUploadValue;
  status?: DocumentUploadStatus;
  error?: string | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status === "uploading" || disabled;
  const hint = [acceptHint, maxSizeHint].filter(Boolean).join(" · ");

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  function handleChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    onSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-matchon-border bg-white p-4 shadow-sm",
        error && "border-destructive/40",
        className,
      )}
      aria-busy={status === "uploading" || undefined}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-matchon-text-primary">
              {label}
            </h3>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                required
                  ? "bg-matchon-primary/10 text-matchon-primary"
                  : "bg-matchon-surface text-matchon-text-secondary",
              )}
            >
              {required ? "필수" : "선택"}
            </span>
          </div>
          {description ? (
            <p className="text-sm leading-relaxed text-matchon-text-secondary">
              {description}
            </p>
          ) : null}
          {hint ? (
            <p className="text-xs text-matchon-text-secondary">{hint}</p>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        onChange={(e) => handleChange(e.target.files)}
      />

      {!value ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-controls={inputId}
            onClick={openPicker}
          >
            파일 선택
          </Button>
          <p className="text-sm text-matchon-text-secondary">
            선택된 파일이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="min-w-0 rounded-lg bg-matchon-surface/70 px-3 py-2">
            <p
              className="truncate text-sm font-medium text-matchon-text-primary"
              title={value.fileName}
            >
              {value.fileName}
            </p>
            <p className="text-xs text-matchon-text-secondary">
              {formatFileSize(value.sizeBytes)}
              {value.mimeType ? ` · ${value.mimeType}` : ""}
            </p>
          </div>
          {statusMessage(status) ? (
            <p className="text-xs text-matchon-text-secondary" role="status">
              {status === "uploading" ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-3 animate-spin rounded-full border-2 border-matchon-border border-t-matchon-primary"
                    aria-hidden
                  />
                  {statusMessage(status)}
                </span>
              ) : (
                statusMessage(status)
              )}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={openPicker}
            >
              교체
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onRemove}
            >
              삭제
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
