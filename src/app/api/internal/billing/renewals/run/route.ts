import { NextResponse } from "next/server";
import { isBillingBusinessEnforcementActive } from "@/lib/billing/billing-provider-config";
import {
  expireCancelledSubscriptions,
  runBillingRenewals,
} from "@/lib/services/billing-renewal.service";

/**
 * Railway Cron / internal scheduler entry.
 * Auth: Authorization: Bearer $MATCHON_BILLING_CRON_SECRET
 */
export async function POST(request: Request) {
  const secret = String(process.env.MATCHON_BILLING_CRON_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MATCHON_BILLING_CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enforcementActive = await isBillingBusinessEnforcementActive();
  if (!enforcementActive) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "BILLING_DISABLED",
    });
  }

  const renewals = await runBillingRenewals(50);
  const expired = await expireCancelledSubscriptions();
  return NextResponse.json({ ok: true, renewals, expired });
}
