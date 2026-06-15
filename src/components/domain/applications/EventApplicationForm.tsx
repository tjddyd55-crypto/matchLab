"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { applyToEventAction } from "@/features/applications/actions";
import { ApplicationAgreementChecklist } from "@/components/domain/applications/ApplicationAgreementChecklist";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FighterRow = {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordSummary: string;
  appliedDivisionIds: string[];
  guardianPolicyRequires: boolean;
  guardianConsentOk: boolean;
};

type DivisionRow = { id: string; label: string };

type EventApplicationFormProps = {
  eventId: string;
  divisions: DivisionRow[];
  fighters: FighterRow[];
  streamingAgreementRequired: boolean;
  streamingNoticeText: string | null;
};

type ApplySuccess = {
  applicationId: string;
  paymentInstruction: {
    feeAmount: number;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    depositorRule: string | null;
    paymentDueDate: string | null;
  };
};

function fighterDivisionBlockReason(
  fighter: FighterRow,
  divisionId: string,
): string | null {
  if (!divisionId) return "경기구분을 선택해 주세요.";
  if (fighter.appliedDivisionIds.includes(divisionId)) {
    return "이미 이 경기구분에 신청했습니다.";
  }
  return null;
}

export function EventApplicationForm(props: EventApplicationFormProps) {
  const [divisionId, setDivisionId] = useState(props.divisions[0]?.id ?? "");
  const [fighterId, setFighterId] = useState<string>("");

  const [state, formAction] = useActionState(
    applyToEventAction,
    null as ActionResult<ApplySuccess> | null,
  );

  const selectedFighter = useMemo(
    () => props.fighters.find((f) => f.id === fighterId),
    [fighterId, props.fighters],
  );

  const blockReason =
    selectedFighter && divisionId
      ? fighterDivisionBlockReason(selectedFighter, divisionId)
      : selectedFighter
        ? null
        : fighterId
          ? "선수를 선택해 주세요."
          : null;

  const disabledSubmit =
    Boolean(blockReason) || !divisionId || !fighterId || state?.ok === true;

  if (state?.ok) {
    return (
      <div className="grid gap-6">
        <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/10 px-4 py-3 text-sm">
          신청이 접수되었습니다. 아래 계좌로 참가비를 입금해 주세요.
          {/* TODO: Event 단위 GuardianConsent 레코드 분리 시 동의 연계 마이그레이션 */}
        </div>
        <PaymentInstructionCard {...state.data.paymentInstruction} />
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={props.eventId} />
      <input
        type="hidden"
        name="streamingAgreementRequired"
        value={props.streamingAgreementRequired ? "1" : "0"}
      />

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="divisionId">
          부문
        </label>
        <select
          id="divisionId"
          name="divisionId"
          required
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          className="border-input bg-background ring-ring/50 h-10 w-full max-w-xl rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
        >
          {props.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">선수</div>
        <input type="hidden" name="fighterId" value={fighterId} />
        <div className="grid gap-2 md:grid-cols-2">
          {props.fighters.map((f) => {
            const reason = fighterDivisionBlockReason(f, divisionId);
            const selected = fighterId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFighterId(f.id)}
                disabled={Boolean(reason)}
                className={cn(
                  "flex gap-3 rounded-xl border p-3 text-left text-sm transition",
                  selected
                    ? "border-primary ring-primary/40 ring-2"
                    : "border-border hover:bg-muted/40",
                  reason ? "cursor-not-allowed opacity-60" : "",
                )}
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {f.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.profileImageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xs font-semibold">
                      {f.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {f.fighterCode} · {f.recordSummary}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {reason ?? "신청 가능"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ApplicationAgreementChecklist
        streamingAgreementRequired={props.streamingAgreementRequired}
        streamingNoticeText={props.streamingNoticeText}
      />

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="memo">
          메모 (선택)
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          maxLength={2000}
          className="border-input bg-background min-h-[88px] w-full max-w-xl rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="주최자에게 전달할 참고 사항"
        />
      </div>

      {blockReason && fighterId ? (
        <p className="text-destructive text-sm">{blockReason}</p>
      ) : null}

      {state && !state.ok ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}

      <Button type="submit" disabled={disabledSubmit}>
        신청하기
      </Button>
    </form>
  );
}
