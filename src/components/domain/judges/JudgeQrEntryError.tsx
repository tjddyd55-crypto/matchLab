import { EmptyState } from "@/components/shared/EmptyState";
import {
  judgeQrEntryUserMessage,
  type JudgeQrEntryFailureReason,
  type JudgeQrEntryQrType,
} from "@/lib/services/judge-qr-entry.service";

export function JudgeQrEntryError({
  reason,
  qrType,
}: {
  reason: JudgeQrEntryFailureReason;
  qrType: JudgeQrEntryQrType;
}) {
  const message = judgeQrEntryUserMessage(reason, qrType);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-10">
      <EmptyState title={message.title} description={message.description} />
    </div>
  );
}
