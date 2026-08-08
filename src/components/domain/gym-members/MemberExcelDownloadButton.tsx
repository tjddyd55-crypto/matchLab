"use client";

import { useTransition } from "react";
import { exportGymMembersExcelAction } from "@/features/gym-members/actions";
import { Button } from "@/components/ui/button";

export function MemberExcelDownloadButton({
  filters,
}: {
  filters: {
    q?: string;
    status?: string;
    fighter?: string;
    joined?: string;
    groupId?: string;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await exportGymMembersExcelAction(filters);
          if (!result.ok) {
            window.alert(result.error.message);
            return;
          }
          const binary = atob(result.data.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.data.filename;
          a.click();
          URL.revokeObjectURL(url);
        });
      }}
    >
      {pending ? "내보내는 중…" : "엑셀 다운로드"}
    </Button>
  );
}
