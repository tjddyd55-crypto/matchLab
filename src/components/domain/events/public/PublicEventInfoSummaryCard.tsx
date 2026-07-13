import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { PUBLIC_REGISTRATION_STATUS_LABELS } from "@/lib/event-public-display";
import { formatPublicDate } from "@/lib/date-display";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { resolvePublicRegistrationMatchonStatus } from "@/lib/ui/public-spectator-ui";
import { matchonSectionTitleClass, matchonStatCardClass } from "@/lib/ui/matchon-shell-ui";

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <dt className="shrink-0 text-xs font-semibold text-matchon-text-secondary sm:w-24 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-matchon-text-primary">{children}</dd>
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
    <section className={matchonStatCardClass}>
      <div className="mb-4 space-y-1">
        <h2 className={matchonSectionTitleClass}>대회 핵심 정보</h2>
        <p className="text-sm text-matchon-text-secondary">
          신청·참가비·장소·대진표·결과 공개 상태를 한눈에 확인할 수 있습니다.
        </p>
      </div>
      <dl className="space-y-3.5">
        <SummaryRow label="신청 상태">
          <div className="flex flex-wrap items-center gap-2">
            <MatchonStatusBadge
              status={resolvePublicRegistrationMatchonStatus(event.registrationStatus)}
              label={PUBLIC_REGISTRATION_STATUS_LABELS[event.registrationStatus]}
              size="sm"
            />
            <PublicEventDeadlineBadge event={event} compact />
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
          <span className="font-semibold">
            {event.location?.trim() || "추후 안내"}
          </span>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            대회일 {formatPublicDate(event.eventDate)}
          </p>
        </SummaryRow>

        <SummaryRow label="공개 상태">
          <PublicEventTrustBadges event={event} compact />
        </SummaryRow>
      </dl>
    </section>
  );
}
