import type { ReactNode } from "react";

export default function StaffGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card/30 border-b px-4 py-3">
        <p className="text-muted-foreground text-center text-xs md:text-left">
          결과 입력 · 로그인 없이 현장 스태프 전용 화면입니다.
        </p>
      </header>
      {children}
    </div>
  );
}
