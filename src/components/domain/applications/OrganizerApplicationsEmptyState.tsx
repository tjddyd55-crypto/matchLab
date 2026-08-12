import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function OrganizerApplicationsEmptyState({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return <MatchonEmptyState title={message} description={description} />;
}
