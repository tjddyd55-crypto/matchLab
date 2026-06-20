import { AppShell } from "@/components/layout/AppShell";

/** 관람객 전용 — 헤더·대시보드 없이 모바일 watch UI만 */
export default function SpectatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
