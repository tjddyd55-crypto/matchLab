"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isMatchonDesktopClient } from "@/lib/desktop/client";
import { managerRoleHomeFromPathname } from "@/lib/desktop/manager-navigation";
import { cn } from "@/lib/utils";

const TITLEBAR_HEIGHT_PX = 36;
const WINDOWS_CONTROLS_RESERVE_PX = 138;

type TitleBarMode = "overlay" | "native";

export function DesktopManagerTitleBar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [visible, setVisible] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isMatchonDesktopClient()) return;

    let cancelled = false;

    void (async () => {
      const bridge = window.matchonDesktop;
      if (!bridge?.getTitleBarMode) return;

      const mode = (await bridge.getTitleBarMode()) as TitleBarMode;
      if (cancelled || mode !== "overlay") return;

      document.documentElement.classList.add("desktop-titlebar-overlay");
      document.documentElement.style.setProperty(
        "--desktop-titlebar-height",
        `${TITLEBAR_HEIGHT_PX}px`,
      );
      setVisible(true);

      const version = await bridge.getAppVersion?.();
      if (!cancelled && version) setAppVersion(version);
    })();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("desktop-titlebar-overlay");
    };
  }, [pathname]);

  const handleBack = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const bridge = window.matchonDesktop;
      const result = await bridge?.navigateBack?.();
      if (result?.action === "back") {
        return;
      }
      router.push(managerRoleHomeFromPathname(pathname));
    } finally {
      setBusy(false);
    }
  }, [busy, pathname, router]);

  if (!visible) return null;

  const versionLabel = appVersion ? `v${appVersion}` : "";

  return (
    <header
      className={cn(
        "desktop-titlebar-drag fixed inset-x-0 top-0 z-[10000] flex items-center",
        "border-b border-matchon-border/60 bg-matchon-surface text-matchon-text-primary",
      )}
      style={{ height: TITLEBAR_HEIGHT_PX }}
      data-desktop-manager-titlebar=""
    >
      <button
        type="button"
        onClick={() => void handleBack()}
        disabled={busy}
        className={cn(
          "desktop-titlebar-no-drag ml-2 inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-semibold",
          "text-matchon-text-secondary hover:bg-matchon-border/40 hover:text-matchon-text-primary",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        aria-label="뒤로"
      >
        <span aria-hidden className="text-sm leading-none">
          ←
        </span>
        뒤로
      </button>

      <div className="desktop-titlebar-drag pointer-events-none flex min-w-0 flex-1 items-center justify-center gap-2 px-2 text-xs font-semibold tracking-wide">
        <span className="truncate text-matchon-primary">MATCHON Manager</span>
        {versionLabel ? (
          <span className="truncate font-normal text-matchon-text-secondary">
            {versionLabel}
          </span>
        ) : null}
      </div>

      <div
        className="desktop-titlebar-no-drag shrink-0"
        style={{ width: WINDOWS_CONTROLS_RESERVE_PX }}
        aria-hidden
      />
    </header>
  );
}
