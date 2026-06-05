import type { BulkApplyToEventSuccessDTO } from "@/lib/services/application.service";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";

export function GymBulkApplicationResult({
  result,
}: {
  result: BulkApplyToEventSuccessDTO;
}) {
  const failedItems = result.items.filter((i) => i.outcome === "failed");
  const skippedItems = result.items.filter((i) => i.outcome === "skipped");

  return (
    <div className="grid gap-6">
      <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/10 px-4 py-4 text-sm">
        <p className="font-medium">일괄 신청 완료</p>
        <ul className="text-muted-foreground mt-2 grid gap-1">
          <li>총 선택: {result.totalSelected}명</li>
          <li>신청 생성: {result.createdCount}명</li>
          <li>이미 신청됨: {result.skippedCount}명</li>
          <li>실패: {result.failedCount}명</li>
        </ul>
      </div>

      {failedItems.length > 0 ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">실패 목록</p>
          <ul className="mt-2 grid gap-1">
            {failedItems.map((item) => (
              <li key={`${item.fighterId}-${item.divisionId}-failed`}>
                {item.fighterName}: {item.message ?? "신청에 실패했습니다."}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {skippedItems.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">건너뜀</p>
          <ul className="text-muted-foreground mt-2 grid gap-1">
            {skippedItems.map((item) => (
              <li key={`${item.fighterId}-${item.divisionId}-skipped`}>
                {item.fighterName}: {item.message ?? "이미 신청되어 있습니다."}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.paymentInstruction ? (
        <PaymentInstructionCard {...result.paymentInstruction} />
      ) : null}
    </div>
  );
}
