import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { completeTossBillingAuthAction } from "@/features/billing/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BillingTossSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  if (actor.role !== "gym" && actor.role !== "organizer") {
    redirect("/");
  }

  const params = await searchParams;
  const orderId = String(
    Array.isArray(params.orderId) ? params.orderId[0] : params.orderId ?? "",
  );
  const authKey = String(
    Array.isArray(params.authKey) ? params.authKey[0] : params.authKey ?? "",
  );
  const customerKey = String(
    Array.isArray(params.customerKey)
      ? params.customerKey[0]
      : params.customerKey ?? "",
  );

  if (!orderId || !authKey || !customerKey) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-bold">결제 인증 정보가 없습니다.</h1>
        <Link href="/billing/checkout" className="mt-4 inline-block underline">
          다시 시도
        </Link>
      </div>
    );
  }

  const result = await completeTossBillingAuthAction({
    orderId,
    authKey,
    customerKey,
  });

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <h1 className="text-xl font-bold text-red-700">결제에 실패했습니다.</h1>
        <p className="text-sm text-matchon-text-secondary">{result.error}</p>
        <Link href="/billing/checkout" className="underline text-matchon-primary">
          결제 화면으로
        </Link>
      </div>
    );
  }

  const q = new URLSearchParams({
    mode: "activated",
    plan: result.data.plan.name,
    amount: String(result.data.finalAmount),
    freeMonths: String(result.data.freeMonths),
    trialEndAt: result.data.trialEndAt ?? "",
    periodEnd: result.data.currentPeriodEnd ?? "",
  });
  redirect(`/billing/success?${q.toString()}`);
}
