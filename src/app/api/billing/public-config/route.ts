import { NextResponse } from "next/server";
import { getBillingPublicConfig } from "@/lib/billing/billing-provider-config";

export const dynamic = "force-dynamic";

/** Client-safe billing provider config (no secrets). */
export async function GET() {
  const cfg = await getBillingPublicConfig();
  return NextResponse.json({
    provider: cfg.provider,
    enabled: cfg.enabled,
    environment: cfg.environment,
    clientKey: cfg.clientKey,
    isTestKey: cfg.isTestKey,
  });
}
