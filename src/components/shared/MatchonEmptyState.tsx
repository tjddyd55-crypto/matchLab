import { Card, CardContent } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import type { FeedbackTone } from "@/components/shared/FeedbackMessage";

export function MatchonEmptyState({
  title,
  description,
  tone = "info",
  action,
}: {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  action?: React.ReactNode;
}) {
  return (
    <Card variant="muted" className="gap-0 py-4 md:py-5">
      <CardContent className="space-y-3 px-3 sm:px-4">
        <FeedbackMessage tone={tone} role="status">
          <span className="font-medium">{title}</span>
          {description ? (
            <span className="mt-1 block font-normal leading-relaxed">
              {description}
            </span>
          ) : null}
        </FeedbackMessage>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
