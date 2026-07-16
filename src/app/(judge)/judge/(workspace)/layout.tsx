import type { ReactNode } from "react";
import { MatchonLogo } from "@/components/common/MatchonLogo";

/**
 * 심판 세션 화면 공통 chrome — 로그인/verify/entry에는 적용하지 않음.
 */
export default function JudgeWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-center border-b border-matchon-border bg-white px-4 py-3 md:justify-start">
        <MatchonLogo href="/" size="sm" variant="light" />
      </header>
      {children}
    </>
  );
}
