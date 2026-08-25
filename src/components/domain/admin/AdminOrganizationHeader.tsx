import type { ReactNode } from "react";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { adminMutedTextClass } from "@/lib/ui/admin-ui";

export function AdminOrganizationHeader({
  title,
  statusLabel,
  statusMatchon,
  metaLines,
  actions,
  statusActions,
}: {
  title: string;
  statusLabel: string;
  statusMatchon: MatchonStatus;
  metaLines: string[];
  actions?: ReactNode;
  statusActions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-matchon-text sm:text-2xl">
            {title}
          </h1>
          <MatchonStatusBadge
            status={statusMatchon}
            label={statusLabel}
            size="sm"
          />
        </div>
        {metaLines.map((line) => (
          <p key={line} className={`${adminMutedTextClass} text-sm`}>
            {line}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {statusActions}
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
