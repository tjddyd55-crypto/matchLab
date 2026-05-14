import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header variant="public" />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
