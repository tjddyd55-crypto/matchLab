"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ApplicationPdfViewButton({
  label,
  fetchViewUrl,
}: {
  label: string;
  fetchViewUrl: () => Promise<
    | { ok: true; viewUrl: string; fileName: string }
    | { ok: false; message: string }
  >;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openPdf() {
    setError(null);
    startTransition(async () => {
      const res = await fetchViewUrl();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      window.open(res.viewUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={openPdf}
      >
        {pending ? "준비 중…" : label}
      </Button>
      {error ? (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
