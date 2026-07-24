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

      {plan.bracketLink ? (
        <ActionButton link={plan.bracketLink} variant="outline" />
      ) : event.gymApplicationCount > 0 ? (
        <span className="block text-center text-xs text-matchon-text-secondary">
          대진표 준비 중
        </span>
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
    </div>
  );
}

/** Gym 전용 요약 — 공개 배지와 중복되는 공개/신청/대진/결과 상태는 반복하지 않는다. */
export function GymEventApplicationSummary({
  event,
}: {
  event: GymDashboardEventItemDTO;
}) {
  const hasApps = event.gymApplicationCount > 0;

  return (
    <div className="shrink-0 space-y-0.5 rounded-xl border border-matchon-border/80 bg-matchon-primary-light/25 px-3 py-2 text-xs">
      <p className="font-semibold text-matchon-text-primary">
        우리 체육관 신청{" "}
        <span className="tabular-nums">{event.gymApplicationCount}명</span>
        <span className="font-normal text-matchon-text-secondary">
          {" "}
          · {hasApps ? "신청 있음" : "신청 없음"}
        </span>
      </p>
    </div>
  );
}
