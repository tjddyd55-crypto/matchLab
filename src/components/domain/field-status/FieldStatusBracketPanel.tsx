"use client";

import { Fragment, useState } from "react";
import { applyFieldBracketOutcomeFormActionVoid } from "@/features/field-status/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { BracketMatchOutcomeStyle } from "@/generated/prisma";
import { cn } from "@/lib/utils";

function OutcomeForm({
  row,
  assignment,
  resultType,
  label,
  variant = "outline",
  confirmMessage,
}: {
  row: FieldStatusRowDTO;
  assignment: FieldStatusRowDTO["bracketAssignments"][number];
  resultType: BracketMatchOutcomeStyle;
  label: string;
  variant?: "outline" | "destructive" | "secondary" | "default";
  confirmMessage: string;
}) {
  const { confirm } = useAppConfirmDialog();

  if (assignment.hasOfficialResult) {
    return null;
  }

  return (
    <form
      action={async (formData) => {
        const ok = await confirm({
          title: confirmMessage,
          variant: "danger",
        });
        if (!ok) return;
        await applyFieldBracketOutcomeFormActionVoid(formData);
      }}
    >
      <input type="hidden" name="applicationId" value={row.applicationId} />
      <input type="hidden" name="matchId" value={assignment.matchId} />
      <input type="hidden" name="loserFighterId" value={row.fighterId} />
      <input type="hidden" name="resultType" value={resultType} />
      <input type="hidden" name="confirmOfficial" value="true" />
      <input
        type="hidden"
        name="resultMemo"
        value="현장·계체 처리에 따른 대진 패 처리"
      />
      <Button type="submit" size="sm" variant={variant} className="h-7 text-xs">
        {label}
      </Button>
    </form>
  );
}

export function FieldStatusBracketPanel({
  row,
  compact = false,
}: {
  row: FieldStatusRowDTO;
  compact?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const assignments = row.bracketAssignments;

  if (assignments.length === 0) {
    return compact ? (
      <span className="text-muted-foreground text-xs">대진 미배정</span>
    ) : (
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm">
        <p className="text-muted-foreground text-xs font-medium">대진 배정</p>
        <p className="mt-1">대진 미배정</p>
      </div>
    );
  }

  const showOutcomePrompt =
    !dismissed &&
    assignments.some((a) => !a.hasOfficialResult) &&
    (row.weighInStatus === "fail" ||
      row.weighInStatus === "manual_fail" ||
      row.checkInStatus === "no_show" ||
      row.checkInStatus === "withdrawn" ||
      row.checkInStatus === "disqualified");

  if (compact) {
    const primary = assignments[0]!;
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground shrink-0">
          {primary.matchLabel} vs {primary.opponentName}
        </span>
        {showOutcomePrompt ? (
          <div className="flex flex-wrap items-center gap-1">
            {assignments
              .filter((a) => !a.hasOfficialResult)
              .map((a) => (
                <Fragment key={a.matchId}>
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.forfeit}
                    label="패배"
                    variant="destructive"
                    confirmMessage={`${row.fighterName} 선수를 패배 처리할까요?`}
                  />
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.disqualification}
                    label="실격"
                    variant="destructive"
                    confirmMessage={`${row.fighterName} 선수를 실격 처리할까요?`}
                  />
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.forfeit}
                    label="기권"
                    variant="secondary"
                    confirmMessage={`${row.fighterName} 선수를 기권 처리할까요?`}
                  />
                </Fragment>
              ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setDismissed(true)}
            >
              그래도 진행
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setDismissed(true)}
            >
              나중에
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">대진 배정</p>
      <ul className="space-y-2 text-sm">
        {assignments.map((a) => (
          <li key={a.matchId} className="rounded-md border bg-card px-3 py-2">
            <p>
              배정 경기:{" "}
              <span className="font-medium">
                {a.matchLabel} vs {a.opponentName}
              </span>
            </p>
            {a.divisionLabel ? (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {a.divisionLabel}
              </p>
            ) : null}
            {a.hasOfficialResult ? (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                공식 결과가 확정된 경기입니다.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs">
                계체 실패 후 패 처리 가능
              </p>
            )}
          </li>
        ))}
      </ul>

      {showOutcomePrompt ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            이 선수는 이미 대진표에 배정되어 있습니다.
          </p>
          <p className="text-muted-foreground text-xs">
            계체 실패·미출석·철회·실격 상태입니다. 대진에서 어떻게 처리할지
            선택해 주세요.
          </p>
          <div
            className={cn(
              "flex flex-wrap gap-2",
              compact && "grid grid-cols-2 gap-1",
            )}
          >
            {assignments
              .filter((a) => !a.hasOfficialResult)
              .map((a) => (
                <div key={a.matchId} className="flex flex-wrap gap-1">
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.forfeit}
                    label="패배 처리"
                    variant="destructive"
                    confirmMessage={`${row.fighterName} 선수를 패배(기권) 처리하고 상대를 승리 처리할까요?`}
                  />
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.disqualification}
                    label="실격 처리"
                    variant="destructive"
                    confirmMessage={`${row.fighterName} 선수를 실격 처리하고 상대를 승리 처리할까요?`}
                  />
                  <OutcomeForm
                    row={row}
                    assignment={a}
                    resultType={BracketMatchOutcomeStyle.forfeit}
                    label="기권 처리"
                    variant="secondary"
                    confirmMessage={`${row.fighterName} 선수를 기권 처리하고 상대를 승리 처리할까요?`}
                  />
                </div>
              ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setDismissed(true)}
            >
              그래도 진행
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setDismissed(true)}
            >
              나중에 결정
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
