import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import type { JudgeQrEntryFailureReason } from "@/lib/services/judge-qr-entry.service";

export const dynamic = "force-dynamic";

const FAILURE_REASONS = new Set<JudgeQrEntryFailureReason>([
  "missing_token",
  "missing_event",
  "missing_court",
  "token_mismatch",
  "court_disabled",
  "event_closed",
  "wrong_qr_type",
]);

function parseFailureReason(
  value: string | undefined,
): JudgeQrEntryFailureReason {
  if (value && FAILURE_REASONS.has(value as JudgeQrEntryFailureReason)) {
    return value as JudgeQrEntryFailureReason;
  }
  return "missing_token";
}

export default async function JudgeEntryErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const reason = parseFailureReason(sp.reason?.trim());

  return <JudgeQrEntryError reason={reason} qrType="court" />;
}
