import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type PaymentInstructionCardProps = {
  feeAmount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  depositorRule: string | null;
  paymentDueDate: string | null;
};

export function PaymentInstructionCard(props: PaymentInstructionCardProps) {
  const due = props.paymentDueDate
    ? new Date(props.paymentDueDate).toLocaleString("ko-KR", {
        dateStyle: "medium",
      })
    : "별도 안내";

  return (
    <Card className="border-emerald-600/30 bg-emerald-950/10">
      <CardHeader>
        <CardTitle className="text-lg">참가비 입금 안내</CardTitle>
        <CardDescription>
          입금 후 주최자 확인이 완료되면 신청 상세의 입금 상태가 변경됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">참가비</span>
          <span className="font-medium tabular-nums">
            {props.feeAmount.toLocaleString("ko-KR")}원
          </span>
        </div>
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">은행</span>
          <span className="font-medium">{props.bankName}</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">계좌번호</span>
          <span className="font-medium tracking-wide">{props.accountNumber}</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <span className="text-muted-foreground">예금주</span>
          <span className="font-medium">{props.accountHolder}</span>
        </div>
        {props.depositorRule ? (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <div className="text-muted-foreground text-xs">입금자명 규칙</div>
            <div className="mt-1 whitespace-pre-wrap">{props.depositorRule}</div>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">입금 마감</span>
          <span className="font-medium">{due}</span>
        </div>
      </CardContent>
    </Card>
  );
}
