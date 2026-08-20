"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { applyToEventAction } from "@/features/applications/actions";
import { ApplicationWeightAutoAssign } from "@/components/domain/applications/ApplicationWeightAutoAssign";
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

type DivisionRow = {
  id: string;
  label: string;
  gender: string | null;
  ageGroup: string | null;
  sportType: string | null;
  weightClass: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
};

type FighterRow = {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordSummary: string;
  gender: string;
  appliedDivisionIds: string[];
  guardianPolicyRequires: boolean;
  guardianConsentOk: boolean;
};

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

export function EventApplicationForm(props: EventApplicationFormProps) {
  const [fighterId, setFighterId] = useState<string>("");
  const [competitionCategory, setCompetitionCategory] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [applicationWeightKg, setApplicationWeightKg] = useState("");

  const [state, formAction] = useActionState(
    applyToEventAction,
    null as ActionResult<ApplySuccess> | null,
  );

  const selectedFighter = useMemo(
    () => props.fighters.find((f) => f.id === fighterId),
    [fighterId, props.fighters],
  );

  const gender =
    selectedFighter?.gender === "female" || selectedFighter?.gender === "여"
      ? "female"
      : selectedFighter
        ? "male"
        : "";

  const disabledSubmit = !fighterId || !competitionCategory || !applicationWeightKg || state?.ok === true;

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
          <CardTitle className="text-base">선수 선택</CardTitle>
          <CardDescription>신청할 선수를 선택해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="fighterId" value={fighterId} />
          <div className="grid gap-3 md:grid-cols-2">
            {props.fighters.map((f) => {
              const selected = fighterId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFighterId(f.id)}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 text-left text-sm transition",
                    selected
                      ? "border-primary ring-primary/40 ring-2"
                      : "border-border hover:bg-muted/40",
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
                      신청 가능
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
          <CardTitle className="text-base">신청체중 · 체급 자동배정</CardTitle>
          <CardDescription>
            체급명과 체중기준은 입력하지 않습니다. 신청체중으로 대회 체급표에
            맞춰 배정됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationWeightAutoAssign
            divisions={props.divisions}
            gender={gender}
            competitionCategory={competitionCategory}
            discipline={discipline}
            applicationWeightKg={applicationWeightKg}
            onCompetitionCategoryChange={setCompetitionCategory}
            onDisciplineChange={setDiscipline}
            onApplicationWeightChange={setApplicationWeightKg}
            fieldClass={publicApplicationFieldSelectClass}
            labelClass="text-muted-foreground mb-1 block text-xs font-medium"
            hiddenInputNames={{
              competitionCategory: "competitionCategory",
              discipline: "discipline",
              applicationWeightKg: "applicationWeightKg",
            }}
          />
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

      {state && !state.ok ? (
        <FeedbackMessage tone="error" role="alert">
          {state.error.message}
        </FeedbackMessage>
      ) : null}

      <Button type="submit" size="default" disabled={disabledSubmit} className="w-full">
        신청하기
      </Button>
    </form>
  );
}
