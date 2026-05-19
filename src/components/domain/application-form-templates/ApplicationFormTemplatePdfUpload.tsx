"use client";

import { useRef, useState, useTransition } from "react";
import {
  APPLICATION_FORM_PDF_MAX_BYTES,
  APPLICATION_FORM_PDF_MIME,
} from "@/lib/constants/application-form-pdf-upload";
import { requestApplicationFormTemplatePdfUploadAction } from "@/features/application-form-templates/pdf-upload-actions";
import { Button } from "@/components/ui/button";

export function ApplicationFormTemplatePdfUpload({
  templateId,
  fileName,
  onUploaded,
}: {
  templateId?: string;
  fileName: string | null;
  onUploaded: (path: string, originalFileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(fileName);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== APPLICATION_FORM_PDF_MIME) {
      setError("PDF 파일(.pdf)만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > APPLICATION_FORM_PDF_MAX_BYTES) {
      setError(
        `파일 크기는 ${Math.round(APPLICATION_FORM_PDF_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`,
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      if (templateId) fd.set("templateId", templateId);
      fd.set("mimeType", APPLICATION_FORM_PDF_MIME);
      const issue = await requestApplicationFormTemplatePdfUploadAction(fd);
      if (!issue.ok) {
        setError(issue.error.message);
        return;
      }

      const putRes = await fetch(issue.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": APPLICATION_FORM_PDF_MIME },
        body: file,
      });
      if (!putRes.ok) {
        setError("PDF 업로드에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      setUploadedName(file.name);
      onUploaded(issue.data.path, file.name);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
      <div className="text-sm font-medium">공식 신청서 PDF 업로드</div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        private Storage 버킷(
        <code className="text-[11px]">application-forms</code>)에 저장됩니다.
        허용: PDF · 최대{" "}
        {Math.round(APPLICATION_FORM_PDF_MAX_BYTES / (1024 * 1024))}MB
      </p>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "업로드 중…" : "PDF 파일 선택"}
        </Button>
        {uploadedName ? (
          <span className="text-muted-foreground text-xs">
            업로드됨: {uploadedName}
          </span>
        ) : null}
      </div>
    </div>
  );
}
