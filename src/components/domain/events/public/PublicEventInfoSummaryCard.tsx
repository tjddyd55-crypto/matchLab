import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PUBLIC_REGISTRATION_STATUS_LABELS } from "@/lib/event-public-display";
import { formatPublicDate } from "@/lib/date-display";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <dt className="text-muted-foreground shrink-0 text-xs font-medium sm:w-24 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}

export function PublicEventInfoSummaryCard({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  const paymentLines = event.paymentInfo?.noticeLines ?? [
    event.participantFeeNotice,
  ];

  return (
    <Card variant="muted">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">대회 핵심 정보</CardTitle>
        <CardDescription>
          신청·참가비·장소·대진표·결과 공개 상태를 한눈에 확인할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3.5">
          <SummaryRow label="신청 상태">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {PUBLIC_REGISTRATION_STATUS_LABELS[event.registrationStatus]}
              </span>
              <PublicEventDeadlineBadge event={event} />
            </div>
          </SummaryRow>

          <SummaryRow label="참가비">
            <ul className="space-y-1">
              {paymentLines.map((line) => (
                <li key={line} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </SummaryRow>

          <SummaryRow label="장소">
            <span className="font-medium">
              {event.location?.trim() || "추후 안내"}
            </span>
            <p className="text-muted-foreground mt-1 text-xs">
              대회일 {formatPublicDate(event.eventDate)}
            </p>
          </SummaryRow>

          <SummaryRow label="공개 상태">
            <PublicEventTrustBadges event={event} />
          </SummaryRow>
        </dl>
      </CardContent>
    </Card>
  );
}
