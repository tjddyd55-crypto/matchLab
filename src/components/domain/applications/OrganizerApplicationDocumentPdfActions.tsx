"use client";

import { getApplicationDocumentGeneratedPdfViewUrlAction } from "@/features/application-form-templates/pdf-upload-actions";
import { ApplicationPdfViewButton } from "@/components/domain/applications/ApplicationPdfViewButton";

export function OrganizerApplicationDocumentPdfActions({
  eventId,
  documentId,
  hasGeneratedPdf,
  originalPdfFileName,
}: {
  eventId: string;
  documentId: string;
  hasGeneratedPdf: boolean;
  originalPdfFileName: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {hasGeneratedPdf ? (
        <ApplicationPdfViewButton
          label="완료 PDF 열기"
          fetchViewUrl={async () => {
            const fd = new FormData();
            fd.set("eventId", eventId);
            fd.set("documentId", documentId);
            const res =
              await getApplicationDocumentGeneratedPdfViewUrlAction(fd);
            if (!res.ok) return { ok: false, message: res.error.message };
            return {
              ok: true,
              viewUrl: res.data.viewUrl,
              fileName: res.data.fileName,
            };
          }}
        />
      ) : (
        <p className="text-muted-foreground text-xs">
          PDF overlay가 아직 생성되지 않았습니다. 아래 snapshot 출력 화면을
          이용해 주세요.
        </p>
      )}
      <span className="text-muted-foreground self-center text-xs">
        원본 템플릿: {originalPdfFileName}
      </span>
    </div>
  );
}
