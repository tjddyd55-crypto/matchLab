import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      aria-hidden
    />
  );
}

export function MemberHomeLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-[88px] w-full" />
        ))}
      </div>
      <Bone className="h-40 w-full" />
    </div>
  );
}

export function MemberListLoadingSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="목록 불러오는 중">
      {Array.from({ length: 8 }).map((_, i) => (
        <Bone key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function MemberDetailLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="상세 불러오는 중">
      <Bone className="h-20 w-full" />
      <Bone className="h-10 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-[100px] w-full" />
        ))}
      </div>
      <Bone className="h-48 w-full" />
    </div>
  );
}
