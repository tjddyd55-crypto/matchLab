import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { completePaymentMethodChangeAction } from "@/features/billing/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BillingMethodSuccessPage({
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
        <p>인증 정보가 없습니다.</p>
        <Link href="/billing/account" className="underline">
          돌아가기
        </Link>
      </div>
    );
  }

  const result = await completePaymentMethodChangeAction({
    orderId,
    authKey,
    customerKey,
  });

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold text-red-700">결제수단 변경 실패</h1>
        <p className="text-sm">{result.error}</p>
        <Link href="/billing/account" className="underline">
          돌아가기
        </Link>
      </div>
    );
  }

  redirect("/billing/account");
}
