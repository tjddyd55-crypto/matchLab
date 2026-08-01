"use client";

import { useState, useTransition } from "react";
import { getAssociationApplicationAttachmentDownloadAction } from "@/features/association-applications/actions";
import { Button } from "@/components/ui/button";

const TYPE_LABEL: Record<string, string> = {
  logo: "협회 로고",
  business_registration: "사업자등록증",
  establishment_proof: "설립·등록 증빙",
  other: "기타 서류",
};

type AttachmentRow = {
  id: string;
  attachmentType: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export function AssociationApplicationAttachmentsList({
  attachments,
}: {
  attachments: AttachmentRow[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-matchon-text-secondary">첨부 파일이 없습니다.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold">첨부 파일</p>
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-matchon-border px-3 py-2 text-sm"
          >
            <span>
              {TYPE_LABEL[a.attachmentType] ?? a.attachmentType} ·{" "}
              {a.originalFileName}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  setError(null);
                  const res =
                    await getAssociationApplicationAttachmentDownloadAction(a.id);
                  if (!res.ok) {
                    setError(res.error.message);
                    return;
                  }
                  window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
                });
              }}
            >
              보기
            </Button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
