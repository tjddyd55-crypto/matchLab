"use client";

import { useEffect, useState } from "react";
import { isMatchonDesktopClient } from "@/lib/desktop/client";

/** Header용 짧은 버전 뱃지 */
export function DesktopHeaderVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isMatchonDesktopClient()) return;
    void window.matchonDesktop?.getAppVersion?.().then((v) => {
      if (typeof v === "string" && v.trim()) setVersion(v.trim());
    });
  }, []);

  if (!version) return null;

  return (
    <span
      className="hidden text-xs text-matchon-text-secondary sm:inline"
      data-testid="desktop-header-version"
      title={`MATCHON Manager v${version}`}
    >
      Manager v{version}
    </span>
  );
}
