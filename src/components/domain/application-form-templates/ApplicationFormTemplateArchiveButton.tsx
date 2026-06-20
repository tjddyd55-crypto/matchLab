"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveApplicationFormTemplateAction } from "@/features/application-form-templates/actions";
import { Button } from "@/components/ui/button";

export function ApplicationFormTemplateArchiveButton({
  templateId,
  title,
  isActive,
}: {
  templateId: string;
  title: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isActive) {
    return null;
  }

  function handleArchive() {
    if (
      !window.confirm(
        `"${title}" 템플릿을 보관하시겠습니까? 보관된 템플릿은 대회에 새로 연결할 수 없습니다.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("templateId", templateId);
      const res = await archiveApplicationFormTemplateAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={handleArchive}
      >
        {pending ? "보관 중…" : "보관"}
      </Button>
      {error ? (
        <p className="text-destructive text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
