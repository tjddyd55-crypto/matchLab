"use client";

import { useEffect } from "react";
import { isMatchonDesktopClient } from "@/lib/desktop/client";

/**
 * Desktop login 진입 시 Electron navigation history를 비운다.
 * 로그아웃·미인증 redirect 이후 뒤로가기로 homepage/관리 화면이 복원되지 않게 한다.
 */
export function DesktopAuthBoundaryEffect() {
  useEffect(() => {
    if (!isMatchonDesktopClient()) return;
    const bridge = window.matchonDesktop;
    void bridge?.clearNavigationHistory?.();
  }, []);

  return null;
}
