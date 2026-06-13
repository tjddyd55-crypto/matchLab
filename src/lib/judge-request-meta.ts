import "server-only";

import { headers } from "next/headers";

export async function readRequestClientMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    null;
  const userAgent = h.get("user-agent")?.trim() ?? null;
  return { ip, userAgent };
}
