import type { ReactNode } from "react";

/**
 * Judge route group — 배경만 제공.
 * 로그인 화면은 AuthLoginShell(중앙 로고), 세션 화면은 (workspace) layout header 사용.
 */
export default function JudgeGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-matchon-surface">{children}</div>
  );
}
