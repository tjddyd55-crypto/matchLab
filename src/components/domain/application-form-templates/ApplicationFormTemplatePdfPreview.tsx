"use client";

import { useEffect, useState } from "react";
import { getApplicationFormTemplatePdfViewUrlAction } from "@/features/application-form-templates/pdf-upload-actions";
import { ApplicationPdfViewButton } from "@/components/domain/applications/ApplicationPdfViewButton";

export function ApplicationFormTemplatePdfPreview({
  templateId,
  fileName,
}: {
  templateId: string;
  fileName: string;
}) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fd = new FormData();
      fd.set("templateId", templateId);
      const res = await getApplicationFormTemplatePdfViewUrlAction(fd);
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setViewUrl(res.data.viewUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">업로드된 PDF</h2>
          <p className="text-muted-foreground text-xs">{fileName}</p>
        </div>
        <ApplicationPdfViewButton
          label="PDF 열기"
          fetchViewUrl={async () => {
            const fd = new FormData();
            fd.set("templateId", templateId);
            const res = await getApplicationFormTemplatePdfViewUrlAction(fd);
            if (!res.ok) return { ok: false, message: res.error.message };
            return {
              ok: true,
              viewUrl: res.data.viewUrl,
              fileName: res.data.fileName,
            };
          }}
        />
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : viewUrl ? (
        <iframe
          title={`PDF 미리보기: ${fileName}`}
          src={viewUrl}
          className="h-[480px] w-full rounded-md border bg-white"
        />
      ) : (
        <p className="text-muted-foreground text-xs">PDF 미리보기 로딩 중…</p>
      )}
    </section>
  );
}
