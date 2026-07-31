"use client";

import { useEffect, useState } from "react";
import { isMatchonDesktopClient } from "@/lib/desktop/client";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager 버전 표시 — Electron preload bridge SSOT.
 * 웹 브라우저에서는 렌더하지 않는다.
 */
export function DesktopAppVersionLabel({
  className,
  prefix = "MATCHON Manager",
}: {
  className?: string;
  prefix?: string;
}) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isMatchonDesktopClient()) return;
    const bridge = window.matchonDesktop;
    if (!bridge?.getAppVersion) return;
    void bridge.getAppVersion().then((v) => {
      if (typeof v === "string" && v.trim()) setVersion(v.trim());
    });
  }, []);

  if (!version) return null;

  return (
    <p
      className={cn(
        "text-center text-xs text-matchon-text-secondary",
        className,
      )}
      data-testid="desktop-app-version"
    >
      {prefix} v{version}
    </p>
  );
}
