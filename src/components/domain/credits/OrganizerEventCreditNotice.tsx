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
      <h2 className="font-semibold">크레딧</h2>
      <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
        <li>
          보유 크레딧:{" "}
          <strong className="text-foreground">
            {credit.balance.toLocaleString("ko-KR")}C
          </strong>{" "}
          (약 {credit.balanceKrw.toLocaleString("ko-KR")}원)
        </li>
        <li>
          참가 승인·등록 시 크레딧은 자동으로 차감되지 않습니다.
        </li>
      </ul>
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
