"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * 이미지 업로드 UX 골격 — 실제 signed URL 발급은 `upload.service` + Route Handler.
 */
export function ImageUploader({
  label = "이미지 선택",
}: {
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
    </div>
  );
}
