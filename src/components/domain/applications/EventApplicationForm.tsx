"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { applyToEventAction } from "@/features/applications/actions";
import { ApplicationAgreementChecklist } from "@/components/domain/applications/ApplicationAgreementChecklist";
import { AthleteInsuranceProfileFields } from "@/components/domain/applications/AthleteInsuranceProfileFields";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  publicApplicationFieldSelectClass,
  publicApplicationFieldTextareaClass,
} from "@/lib/ui/public-application-ui";
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
  } | null;
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
        <Card variant="success">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>신청이 접수되었습니다</CardTitle>
              <MatchonStatusBadge status="application_completed" size="sm" />
            </div>
            <CardDescription>
              {state.data.paymentInstruction
                ? "아래 계좌로 참가비를 입금해 주세요."
                : "신청 내역에서 상태를 확인할 수 있습니다."}
            </CardDescription>
          </CardHeader>
        </Card>
        {state.data.paymentInstruction ? (
          <PaymentInstructionCard {...state.data.paymentInstruction} />
        ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">경기구분 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="grid gap-2 text-sm" htmlFor="divisionId">
            <span className="font-medium">경기구분</span>
            <select
              id="divisionId"
              name="divisionId"
              required
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className={publicApplicationFieldSelectClass}
            >
              {props.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">선수 선택</CardTitle>
          <CardDescription>신청할 선수를 선택해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="fighterId" value={fighterId} />
          <div className="grid gap-3 md:grid-cols-2">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">출전 정보</CardTitle>
          <CardDescription>
            전적·운동경력·보험가입 정보는 이번 대회 신청에만 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AthleteInsuranceProfileFields idPrefix="apply" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필수 동의</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationAgreementChecklist
            streamingAgreementRequired={props.streamingAgreementRequired}
            streamingNoticeText={props.streamingNoticeText}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">메모 (선택)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="memo"
            name="memo"
            rows={3}
            maxLength={2000}
            className={publicApplicationFieldTextareaClass}
            placeholder="주최자에게 전달할 참고 사항"
          />
        </CardContent>
      </Card>

      {blockReason && fighterId ? (
        <FeedbackMessage tone="warning" role="alert">
          {blockReason}
        </FeedbackMessage>
      ) : null}

      {state && !state.ok ? (
        <FeedbackMessage tone="error" role="alert">
          {state.error.message}
        </FeedbackMessage>
      ) : null}

      <Button type="submit" size="field" disabled={disabledSubmit} className="w-full">
        신청하기
      </Button>
    </form>
  );
}
