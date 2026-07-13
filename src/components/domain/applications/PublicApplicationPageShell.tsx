import { MatchonLogo } from "@/components/common/MatchonLogo";
import type { ReactNode } from "react";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  publicAuthPageCardClass,
  publicAuthPageDescClass,
  publicAuthPageShellClass,
  publicAuthPageTitleClass,
} from "@/lib/ui/auth-ui";

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
    <div className={publicAuthPageShellClass}>
      <MatchonLogo href={backHref} size="lg" variant="light" className="mb-6" />
      <div className={publicAuthPageCardClass}>
        <div className="space-y-6">
          <header className="space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className={publicAuthPageTitleClass}>{title}</h1>
              {statusBadge ? (
                <MatchonStatusBadge
                  status={statusBadge.status}
                  label={statusBadge.label}
                  size="sm"
                />
              ) : null}
            </div>
            {description ? (
              <p className={publicAuthPageDescClass}>{description}</p>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
