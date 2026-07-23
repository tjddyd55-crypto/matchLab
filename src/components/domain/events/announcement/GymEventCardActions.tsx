import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  resolveGymEventCardActions,
  type GymEventCardActionLink,
} from "@/lib/ui/gym-event-card-actions";
import type { GymDashboardEventItemDTO } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

function ActionButton({
  link,
  variant,
}: {
  link: GymEventCardActionLink;
  variant: "default" | "outline";
}) {
  return (
    <Link
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      className={cn(
        buttonVariants({ variant, size: "field" }),
        "w-full rounded-xl",
      )}
    >
      {link.label}
    </Link>
  );
}

export function GymEventCardActions({
  event,
}: {
  event: GymDashboardEventItemDTO;
}) {
  const plan = resolveGymEventCardActions(event);

  return (
    <div className="space-y-2">
      {plan.primary ? (
        <ActionButton link={plan.primary} variant="default" />
      ) : plan.disabledPrimaryLabel ? (
        <span
          className={cn(
            buttonVariants({ variant: "secondary", size: "field" }),
            "inline-flex w-full cursor-not-allowed justify-center rounded-xl opacity-80",
          )}
          aria-disabled
          title={event.applyDisabledReason ?? plan.disabledPrimaryLabel}
        >
          {plan.disabledPrimaryLabel}
        </span>
      ) : null}

      {plan.secondary ? (
        <ActionButton
          link={plan.secondary}
          variant={plan.primary ? "outline" : "default"}
        />
      ) : null}

      {plan.textLink ? (
        <Link
          href={plan.textLink.href}
          target={plan.textLink.external ? "_blank" : undefined}
          rel={plan.textLink.external ? "noopener noreferrer" : undefined}
          className="block text-center text-xs font-semibold text-matchon-text-secondary underline-offset-2 hover:text-matchon-primary hover:underline"
        >
          {plan.textLink.label}
        </Link>
      ) : null}

      {plan.fieldStatusLink ? (
        <Link
          href={plan.fieldStatusLink.href}
          className="block text-center text-xs font-medium text-matchon-text-secondary underline-offset-2 hover:text-matchon-primary hover:underline"
        >
          {plan.fieldStatusLink.label}
        </Link>
      ) : null}
    </div>
  );
}

export function GymEventApplicationSummary({
  event,
}: {
  event: GymDashboardEventItemDTO;
}) {
  const hasApps = event.gymApplicationCount > 0;

  return (
    <div className="shrink-0 space-y-1 rounded-xl border border-matchon-border/80 bg-matchon-primary-light/25 px-3 py-2 text-xs">
      <p className="font-semibold text-matchon-text-primary">
        우리 체육관 신청{" "}
        <span className="tabular-nums">{event.gymApplicationCount}명</span>
      </p>
      <p className="text-matchon-text-secondary">
        {hasApps ? "신청 완료" : "신청 없음"}
        {!event.hasPaymentSetting ? " · 입금 미설정" : null}
      </p>
      {event.liveStreamingEnabled || event.streamingConsentRequired ? (
        <p className="text-amber-900/80 dark:text-amber-100/90">
          촬영·스트리밍 안내가 필요할 수 있습니다.
        </p>
      ) : null}
      {event.applyDisabledReason && !event.canApply ? (
        <p className="text-matchon-text-secondary">{event.applyDisabledReason}</p>
      ) : null}
    </div>
  );
}
