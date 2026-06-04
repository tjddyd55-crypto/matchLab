import Link from "next/link";
import type { creditService } from "@/lib/services/credit.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreditCtx = NonNullable<
  Awaited<
    ReturnType<typeof creditService.getEventApprovalCreditContext>
  >
>;

export function OrganizerEventCreditNotice({ credit }: { credit: CreditCtx }) {
  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 text-sm leading-relaxed md:px-5">
      <h2 className="font-semibold">크레딧 · 참가 승인</h2>
      <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
        <li>
          이 대회는 선수 승인 1명당{" "}
          <strong className="text-foreground">
            {credit.participantFeeCredits}크레딧
          </strong>
          이 차감됩니다.
        </li>
        <li>
          보유 크레딧:{" "}
          <strong className="text-foreground">
            {credit.balance.toLocaleString("ko-KR")}C
          </strong>{" "}
          (약 {credit.balanceKrw.toLocaleString("ko-KR")}원)
        </li>
        <li>
          현재 잔액으로 약{" "}
          <strong className="text-foreground">
            {credit.approveableCount}명
          </strong>
          의 선수를 추가 승인할 수 있습니다.
        </li>
        {credit.pendingApprovalCount > 0 ? (
          <li>
            승인 대기 {credit.pendingApprovalCount}명 전원 승인 시 예상 차감:{" "}
            <strong className="text-foreground">
              {credit.estimatedDebitForPending.toLocaleString("ko-KR")}C
            </strong>
          </li>
        ) : null}
      </ul>
      {credit.insufficientForOne ? (
        <p className="text-destructive mt-3 font-medium">
          크레딧이 부족하면 참가 승인을 할 수 없습니다. 크레딧을 충전해 주세요.
        </p>
      ) : credit.insufficientForAll && credit.pendingApprovalCount > 0 ? (
        <p className="mt-3 font-medium text-amber-800 dark:text-amber-200">
          승인 대기 인원 전원을 승인하기에는 잔액이 부족할 수 있습니다.
        </p>
      ) : null}
      <div className="mt-4">
        <Link
          href="/organizer/credits"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          크레딧 충전·내역
        </Link>
      </div>
    </section>
  );
}
