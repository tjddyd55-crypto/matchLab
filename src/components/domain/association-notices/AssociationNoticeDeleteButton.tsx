"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAssociationNoticeAction } from "@/features/association-notices/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";

export function AssociationNoticeDeleteButton({
  noticeId,
  title,
}: {
  noticeId: string;
  title: string;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    const ok = await confirm({
      title: "공지 삭제",
      description: `"${title}" 공지를 삭제할까요? 연결된 체육관에서는 더 이상 볼 수 없습니다.`,
      confirmLabel: "삭제",
      cancelLabel: "취소",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteAssociationNoticeAction(noticeId);
      if (!result.ok) {
        setError(result.error.message);
        await alert({
          title: "삭제 실패",
          description: result.error.message,
        });
        return;
      }
      router.push("/organizer/notices");
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => void onDelete()}
        className="border-red-200 text-red-700 hover:bg-red-50"
      >
        {pending ? "삭제 중…" : "삭제"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
