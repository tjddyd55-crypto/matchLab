import type { ReactNode } from "react";
import {
  desktopAppCanvasClass,
  desktopAppViewportClass,
} from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager desktop entry layout.
 * 공개 홈/마케팅 navigation 없이 최소 shell + fixed canvas scroll.
 */
export default function DesktopLayout({ children }: { children: ReactNode }) {
  return (
    <div className={desktopAppViewportClass} data-desktop-app-viewport="">
      <div
        className={cn(
          desktopAppCanvasClass,
          "h-full min-h-0 overflow-y-auto bg-[#F8FAFC] text-[#0F172A]",
        )}
        data-desktop-app-canvas=""
      >
        {children}
      </div>
    </div>
  );
}
