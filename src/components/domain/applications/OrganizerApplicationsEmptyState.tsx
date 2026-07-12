import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function OrganizerApplicationsEmptyState({
  message,
}: {
  message: string;
}) {
  return <MatchonEmptyState title={message} />;
}
