import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export default async function BillingTossFailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireActor();
  const params = await searchParams;
  const code = String(
    Array.isArray(params.code) ? params.code[0] : params.code ?? "",
  );
  const message = String(
    Array.isArray(params.message) ? params.message[0] : params.message ?? "",
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
      <h1 className="text-xl font-bold">결제수단 등록이 취소되었습니다.</h1>
      {message ? (
        <p className="text-sm text-matchon-text-secondary">
          {code ? `[${code}] ` : ""}
          {message}
        </p>
      ) : null}
      <Link
        href="/billing/checkout"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        다시 시도하기
      </Link>
    </div>
  );
}
