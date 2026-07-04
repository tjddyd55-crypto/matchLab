import { cn } from "@/lib/utils";

/** 종목(section) 그룹 제목 — row 보조 라인 대신 목록 상단·섹션 헤더에 사용. */
export function DivisionSportSectionHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-foreground text-sm font-semibold tracking-tight",
        className,
      )}
    >
      {title}
    </h3>
  );
}
