import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { GymRegistrationRequestListItem } from "@/lib/services/registration.service";
import { RegistrationStatusBadge } from "@/components/domain/fighters/RegistrationStatusBadge";
import { RegistrationRequestActions } from "@/components/domain/fighters/RegistrationRequestActions";
import { ConsentStatusBadge } from "@/components/domain/consents/ConsentStatusBadge";

export function GymRegistrationRequestsCards({
  items,
}: {
  items: GymRegistrationRequestListItem[];
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {items.map((r) => (
        <li
          key={r.id}
          className="ring-foreground/10 space-y-3 rounded-xl bg-card p-4 ring-1"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.name}</span>
            <RegistrationStatusBadge status={r.status} />
            <ConsentStatusBadge label={r.consentLabel} kind={r.consentKind} />
            {r.duplicateReviewFlow ? (
              <span className="text-amber-700 text-xs dark:text-amber-400">
                중복 의심
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {r.gender} · {r.birthYearMasked} ·{" "}
            <span className="font-mono">{r.phoneMasked}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            제출{" "}
            {format(parseISO(r.submittedAtIso), "yyyy.MM.dd HH:mm", {
              locale: ko,
            })}
          </p>
          <RegistrationRequestActions
            submissionId={r.id}
            status={r.status}
            consentCopyAbsoluteUrl={r.consentCopyAbsoluteUrl}
            approvalBlockedByConsent={r.approvalBlockedByConsent}
          />
        </li>
      ))}
    </ul>
  );
}
