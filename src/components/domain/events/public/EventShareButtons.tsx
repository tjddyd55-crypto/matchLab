"use client";

import { useEffect, useState } from "react";
import { buildFacebookShareUrl } from "@/lib/share/event-share";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function resolveShareUrl(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.location.href;
}

export function EventShareButtons({
  url,
  className,
  layout = "inline",
}: {
  url: string;
  className?: string;
  layout?: "inline" | "stacked";
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopyLink() {
    setError(null);
    const pageUrl = resolveShareUrl(url);
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("링크 복사에 실패했습니다. 주소창의 URL을 복사해 주세요.");
    }
  }

  function handleFacebookShare() {
    setError(null);
    const pageUrl = resolveShareUrl(url);
    const shareUrl = buildFacebookShareUrl(pageUrl);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=520");
  }

  const isStacked = layout === "stacked";

  return (
    <section className={cn("space-y-2", className)} aria-label="대회 공유">
      <p className="text-muted-foreground text-xs font-medium">공유하기</p>

      <div
        className={cn(
          "flex gap-2",
          isStacked ? "grid w-full grid-cols-2" : "flex-wrap items-center",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size={isStacked ? "default" : "sm"}
          className={cn(isStacked && "w-full")}
          onClick={handleFacebookShare}
        >
          Facebook 공유
        </Button>
        <Button
          type="button"
          variant="outline"
          size={isStacked ? "default" : "sm"}
          className={cn(isStacked && "w-full")}
          onClick={() => void handleCopyLink()}
        >
          링크 복사
        </Button>
      </div>

      {copied ? (
        <p className="text-muted-foreground text-xs" role="status">
          대회 링크를 복사했습니다.
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
