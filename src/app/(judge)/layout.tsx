import type { ReactNode } from "react";
import { MatchonLogo } from "@/components/common/MatchonLogo";

export default function JudgeGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-matchon-surface">
      <header className="flex items-center justify-center border-b border-matchon-border bg-white px-4 py-3 md:justify-start">
        <MatchonLogo href="/" size="sm" variant="light" />
      </header>
      {children}
    </div>
  );
}
