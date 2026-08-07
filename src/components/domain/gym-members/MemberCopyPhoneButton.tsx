"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MemberCopyPhoneButton({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "min-h-11",
        className,
      )}
      aria-label="연락처 복사"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phone);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "복사됨" : "연락처 복사"}
    </button>
  );
}
