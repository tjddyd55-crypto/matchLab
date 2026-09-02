"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setIntakeFormStatusAction } from "@/features/intake-forms/actions";

export function IntakeFormStatusButtons({
  formId,
  status,
}: {
  formId: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(next: "OPEN" | "CLOSED") {
    startTransition(async () => {
      await setIntakeFormStatusAction(formId, next);
      router.refresh();
    });
  }

  if (status === "CLOSED") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => setStatus("OPEN")}
      >
        재오픈
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => setStatus("CLOSED")}
    >
      마감
    </Button>
  );
}
