import type { ReactNode } from "react";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <MatchonEmptyState
      title={title}
      description={description}
      action={action}
    />
  );
}
