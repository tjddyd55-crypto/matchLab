import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";

export function BracketsEmptyState({ message }: { message: string }) {
  return <MatchonEmptyState title={message} />;
}
