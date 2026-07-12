import type { BulkApplyToEventSuccessDTO } from "@/lib/services/application.service";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GymBulkApplicationResult({
  result,
}: {
  result: BulkApplyToEventSuccessDTO;
}) {
  const failedItems = result.items.filter((i) => i.outcome === "failed");
  const skippedItems = result.items.filter((i) => i.outcome === "skipped");

  return (
    <div className="grid gap-6">
      <Card variant="success">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>일괄 신청 완료</CardTitle>
            <MatchonStatusBadge status="application_completed" size="sm" />
          </div>
          <CardDescription>선택한 선수별 신청 결과입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground grid gap-1 text-sm">
            <li>총 선택: {result.totalSelected}명</li>
            <li>신청 생성: {result.createdCount}명</li>
            <li>이미 신청됨: {result.skippedCount}명</li>
            <li>실패: {result.failedCount}명</li>
          </ul>
        </CardContent>
      </Card>

      {failedItems.length > 0 ? (
        <Card variant="danger">
          <CardHeader>
            <CardTitle className="text-base text-destructive">실패 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {failedItems.map((item) => (
                <li key={`${item.fighterId}-${item.divisionId}-failed`}>
                  {item.fighterName}: {item.message ?? "신청에 실패했습니다."}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {skippedItems.length > 0 ? (
        <Card variant="muted">
          <CardHeader>
            <CardTitle className="text-base">건너뜀</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground grid gap-1 text-sm">
              {skippedItems.map((item) => (
                <li key={`${item.fighterId}-${item.divisionId}-skipped`}>
                  {item.fighterName}: {item.message ?? "이미 신청되어 있습니다."}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {result.paymentInstruction ? (
        <PaymentInstructionCard {...result.paymentInstruction} />
      ) : null}
    </div>
  );
}
