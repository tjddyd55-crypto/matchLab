import type { ReactNode } from "react";

export function DevPlaceholder({
  title,
  route,
  children,
}: {
  title: string;
  route: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">{route}</p>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        문서에 정의된 라우트 플레이스홀더입니다. 도메인 기능은 후속 단계에서
        repository → service → UI 순으로 연결합니다.
      </p>
      {children}
    </div>
  );
}
