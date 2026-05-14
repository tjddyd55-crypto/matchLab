"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInviteUrlButton({
  url,
  label = "URL 복사",
}: {
  url: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
      {done ? "복사됨" : label}
    </Button>
  );
}
