import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { OrganizerCreditsDashboard } from "@/components/domain/credits/OrganizerCreditsDashboard";
import { creditPaymentService } from "@/lib/services/credit-payment.service";
import { creditService } from "@/lib/services/credit.service";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function OrganizerCreditsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);

  const organizerId = actor.organizerId;
  if (!organizerId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <EmptyState
          title="주최자 프로필이 필요합니다"
          description="주최자 계정으로 로그인하면 크레딧을 관리할 수 있습니다."
        />
      </div>
    );
  }

  const [summary, ledgers, payments] = await Promise.all([
    creditService.getOrganizerCreditSummary(organizerId),
    creditService.listCreditLedgers(organizerId, 40),
    creditPaymentService.listOrganizerPayments(organizerId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          크레딧
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          참가 신청 승인 시 선수 1명당 크레딧이 차감됩니다. 충전·거래 내역은
          이 화면에서만 확인할 수 있습니다.
        </p>
      </div>

      <OrganizerCreditsDashboard
        summary={summary}
        ledgers={ledgers.map((l) => ({
          id: l.id,
          type: l.type,
          amount: l.amount,
          balanceAfter: l.balanceAfter,
          reason: l.reason,
          createdAtIso: l.createdAt.toISOString(),
        }))}
        payments={payments.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          amountKrw: p.amountKrw,
          credits: p.credits,
          status: p.status,
          createdAtIso: p.createdAt.toISOString(),
        }))}
        devConfirmAllowed={creditPaymentService.isDevPaymentConfirmAllowed(
          actor,
        )}
      />
    </div>
  );
}
