import { redirect } from "next/navigation";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { setCourtJudgeEntryCookie } from "@/lib/court-judge-entry-session";
import { validateCourtJudgeEntry } from "@/lib/services/judge-qr-entry.service";

export const dynamic = "force-dynamic";

export default async function JudgeEntryPage({
  searchParams,
}: {
  searchParams: Promise<{
    eventId?: string;
    courtId?: string;
    token?: string;
    target?: string;
    loginId?: string;
  }>;
}) {
  const sp = await searchParams;
  const target = sp.target?.trim() ?? "";

  if (target === "login") {
    const params = new URLSearchParams();
    const eventId = sp.eventId?.trim();
    if (eventId) params.set("eventId", eventId);
    const loginId = sp.loginId?.trim();
    if (loginId) params.set("loginId", loginId);
    redirect(`/judge/login${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  const result = await validateCourtJudgeEntry({
    eventId: sp.eventId,
    courtId: sp.courtId,
    token: sp.token,
    target: sp.target,
  });

  if (!result.ok) {
    return <JudgeQrEntryError reason={result.reason} qrType="court" />;
  }

  await setCourtJudgeEntryCookie({
    eventId: result.eventId,
    courtId: result.courtId,
    target: result.target,
  });

  redirect(result.redirectTo);
}
