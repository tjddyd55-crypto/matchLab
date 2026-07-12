import Link from "next/link";
import type { ReactNode } from "react";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { cn } from "@/lib/utils";

export function PublicApplicationPageShell({
  title,
  description,
  children,
  backHref = "/",
  statusBadge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  backHref?: string;
  statusBadge?: { status: MatchonStatus; label?: string };
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← 홈
        </Link>
        {statusBadge ? (
          <MatchonStatusBadge
            status={statusBadge.status}
            label={statusBadge.label}
            size="sm"
          />
        ) : null}
      </div>
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
