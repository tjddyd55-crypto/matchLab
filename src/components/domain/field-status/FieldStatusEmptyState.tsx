import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function FieldStatusEmptyState({ message }: { message: string }) {
  return <MatchonEmptyState title={message} />;
}
