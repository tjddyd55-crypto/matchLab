import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SpectatorAccessClosed({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        공개 시간이 아닙니다
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {title} 관람용 페이지(대진표·라이브·결과)는 주최자가 설정한 시간에만
        열립니다.
      </p>
      <p className="text-muted-foreground text-xs">
        이 페이지는 대회 진행 시간에만 공개됩니다.
      </p>
      <Link
        href={`/events/${slug}`}
        className={cn(buttonVariants({ variant: "secondary" }), "mx-auto")}
      >
        대회 안내로 돌아가기
      </Link>
    </div>
  );
}
