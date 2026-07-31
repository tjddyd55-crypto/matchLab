import "server-only";

import { headers } from "next/headers";
import {
  DESKTOP_REQUEST_HEADER,
  DESKTOP_USER_AGENT_TOKEN,
} from "@/lib/desktop/constants";

/**
 * Electron MATCHON Manager 요청 여부 (UI 분기용).
 * 권한 SSOT가 아님 — session/UserRole이 권한 근거.
 */
export async function isMatchonDesktopRequest(): Promise<boolean> {
  const h = await headers();
  if (h.get(DESKTOP_REQUEST_HEADER) === "1") return true;
  const ua = h.get("user-agent") ?? "";
  return ua.includes(DESKTOP_USER_AGENT_TOKEN);
}

export type DesktopRuntimeContext = {
  isDesktop: boolean;
};

export async function getDesktopRuntimeContext(): Promise<DesktopRuntimeContext> {
  return { isDesktop: await isMatchonDesktopRequest() };
}
