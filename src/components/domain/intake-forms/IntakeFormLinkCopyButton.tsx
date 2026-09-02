"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildIntakeFormPublicUrl } from "@/lib/intake-form/public-url";

export function IntakeFormLinkCopyButton({
  publicToken,
  label = "링크 복사",
}: {
  publicToken: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = buildIntakeFormPublicUrl(publicToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? "복사됨" : label}
    </Button>
  );
}
