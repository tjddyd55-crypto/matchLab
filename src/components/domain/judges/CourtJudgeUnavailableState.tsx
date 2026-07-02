"use client";

import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CourtJudgeUnavailableVariant =
  | "invalid_court"
  | "inactive_court";

const COPY: Record<
  CourtJudgeUnavailableVariant,
  { title: string; lines: string[]; badge: string; badgeClass: string }
> = {
  invalid_court: {
    title: "입장할 수 없습니다.",
    lines: [
      "유효하지 않은 경기장 QR입니다.",
      "운영자에게 QR을 다시 확인해 주세요.",
    ],
    badge: "QR 오류",
    badgeClass: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  inactive_court: {
    title: "입장할 수 없습니다.",
    lines: ["현재 사용하지 않는 경기장입니다.", "운영자에게 문의해 주세요."],
    badge: "비활성",
    badgeClass: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

export function CourtJudgeUnavailableState({
  variant,
  roleLabel,
  eventTitle,
  courtName,
  onRefresh,
}: {
  variant: CourtJudgeUnavailableVariant;
  roleLabel: string;
  eventTitle?: string | null;
  courtName?: string | null;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const copy = COPY[variant];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 p-6">
      <header className="space-y-3 text-center">
        <BrandLogo size="md" showText className="justify-center" />
        {eventTitle ? (
          <p className="text-muted-foreground text-sm">{eventTitle}</p>
        ) : null}
        {courtName ? <p className="text-lg font-semibold">{courtName}</p> : null}
        <p className="text-muted-foreground text-sm">{roleLabel}</p>
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
            copy.badgeClass,
          )}
        >
          {copy.badge}
        </span>
      </header>

      <section className="rounded-xl border bg-card p-5 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <div className="text-muted-foreground mt-3 space-y-2 text-sm leading-relaxed">
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onRefresh ? onRefresh() : router.refresh())}
        >
          새로고침
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          뒤로가기
        </Button>
      </div>
    </div>
  );
}
