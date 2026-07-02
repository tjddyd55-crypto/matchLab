import type { ReactNode } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";

export default function JudgeGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card/30 flex items-center justify-center border-b px-4 py-3 md:justify-start">
        <BrandLogo size="sm" showText />
      </header>
      {children}
    </div>
  );
}
