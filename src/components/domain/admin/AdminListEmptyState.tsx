import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function AdminListEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return <MatchonEmptyState title={title} description={description} />;
}
