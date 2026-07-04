import type {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
} from "@/lib/enums";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { getBracketMatchStatusLabel } from "@/lib/ui/match-status-ui";
import { Badge } from "@/components/ui/badge";

function resolveWinnerLabel(input: {
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
}): string {
  if (input.resultType === "draw") return "무승부";
  if (input.resultType === "no_contest") return "노콘테스트";
  if (input.winnerId && input.winnerId === input.fighterRedId) {
    return `홍코너 · ${input.fighterRedName}`;
  }
  if (input.winnerId && input.winnerId === input.fighterBlueId) {
    return `청코너 · ${input.fighterBlueName}`;
  }
  return "미정";
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <span className="min-w-0 truncate text-right text-xs font-medium">
        {value}
      </span>
    </div>
  );
}

/**
 * 시스템이 보유한 최종 결과(승자·결과방식·상태·확정 여부)를 읽기 전용으로 표시한다.
 * 결과 입력/확정은 주심 입력 영역(OrganizerMatchOpsPanel)에서 처리한다.
 */
export function MatchFinalResultSummary({
  status,
  winnerId,
  resultType,
  hasOfficialResults,
  fighterRedId,
  fighterBlueId,
  fighterRedName,
  fighterBlueName,
}: {
  status: BracketMatchStatus;
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  hasOfficialResults: boolean;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
}) {
  const winnerLabel = resolveWinnerLabel({
    winnerId,
    resultType,
    fighterRedId,
    fighterBlueId,
    fighterRedName,
    fighterBlueName,
  });
  const methodLabel =
    (resultType ? outcomeStylePublicLabel(resultType) : null) ?? "—";

  return (
    <section className="border-t pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
      <h3 className="mb-3 text-sm font-semibold">최종 결과</h3>
      <div className="space-y-1.5 rounded-lg border bg-muted/15 p-3">
        <SummaryRow label="승자" value={winnerLabel} />
        <SummaryRow label="결과 방식" value={methodLabel} />
        <SummaryRow label="경기 상태" value={getBracketMatchStatusLabel(status)} />
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground text-[11px]">확정 여부</span>
          <Badge
            variant={hasOfficialResults ? "resultConfirmed" : "resultPending"}
            className="text-[10px]"
          >
            {hasOfficialResults ? "확정" : "확정 전"}
          </Badge>
        </div>
      </div>
    </section>
  );
}
