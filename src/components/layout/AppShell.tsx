import type { ReactNode } from "react";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import {
  desktopAppCanvasClass,
  desktopAppViewportClass,
} from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

export async function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = await isMatchonDesktopRequest();

  if (isDesktop) {
    return (
      <div
        className={desktopAppViewportClass}
        data-desktop-app-viewport=""
      >
        <div
          className={cn(
            desktopAppCanvasClass,
            "flex min-h-full flex-col bg-background text-foreground",
          )}
          data-desktop-app-canvas=""
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      {children}
    </div>
  );
}
