import { MatchonLogo } from "@/components/common/MatchonLogo";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-5 p-4">
      <header className="space-y-3 text-center">
        <MatchonLogo size="md" variant="light" className="justify-center" />
      </header>
      <Card variant="default" className="py-4">
        <CardContent className="space-y-3 px-4">
          <h1 className="text-center text-lg font-semibold">{message.title}</h1>
          <FeedbackMessage tone="error" role="alert">
            {message.description}
          </FeedbackMessage>
        </CardContent>
      </Card>
    </div>
  );
}
