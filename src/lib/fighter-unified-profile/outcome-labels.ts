import type { BracketMatchOutcomeStyle, MatchRecordOutcome } from "@/lib/enums";
import { outcomeLabel } from "@/lib/fighter-career/types";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";

export { outcomeLabel as matchOutcomeLabel };

export function matchResultTypeLabel(
  resultType: BracketMatchOutcomeStyle | null | undefined,
): string | null {
  return outcomeStylePublicLabel(resultType);
}

export function summarizeEventMatchResults(
  rows: { result: MatchRecordOutcome }[],
): string | null {
  if (rows.length === 0) return null;
  const wins = rows.filter((r) => r.result === "win").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const draws = rows.filter((r) => r.result === "draw").length;
  const nc = rows.filter((r) => r.result === "no_contest").length;
  const parts: string[] = [];
  if (wins) parts.push(`${wins}승`);
  if (losses) parts.push(`${losses}패`);
  if (draws) parts.push(`${draws}무`);
  if (nc) parts.push(`${nc}NC`);
  return parts.length > 0 ? parts.join(" ") : null;
}
