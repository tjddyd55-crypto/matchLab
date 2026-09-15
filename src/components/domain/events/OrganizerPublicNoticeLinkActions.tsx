"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildEventPublicUrl } from "@/lib/share/event-share";
import { cn } from "@/lib/utils";

export function OrganizerPublicNoticeLinkActions({
  publicSlug,
}: {
  publicSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const publicUrl = buildEventPublicUrl({ publicSlug });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
        {copied ? "복사됨" : "공개 링크 복사"}
      </Button>
      <Link
        href={`/events/${publicSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        새 창에서 보기
      </Link>
    </div>
  );
}
