"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { createBulkEventApplicationsAction } from "@/features/applications/actions";
import type {
  BulkApplyToEventSuccessDTO,
  EventApplicationDivisionRowDTO,
  EventApplicationFighterRowDTO,
} from "@/lib/services/application.service";
import { ApplicationAgreementChecklist } from "@/components/domain/applications/ApplicationAgreementChecklist";
import {
  GymBulkApplicationCard,
  GymBulkApplicationTableRow,
  type FighterRowState,
} from "@/components/domain/applications/GymBulkApplicationRow";
import { GymBulkApplicationResult } from "@/components/domain/applications/GymBulkApplicationResult";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GymBulkApplicationFormProps = {
  eventId: string;
  divisions: EventApplicationDivisionRowDTO[];
  fighters: EventApplicationFighterRowDTO[];
  streamingAgreementRequired: boolean;
  streamingNoticeText: string | null;
  hasOfficialTemplate: boolean;
};

function initialRowStates(
  fighters: EventApplicationFighterRowDTO[],
): Record<string, FighterRowState> {
  const map: Record<string, FighterRowState> = {};
  for (const fighter of fighters) {
    map[fighter.id] = { checked: false, divisionId: "" };
  }
  return map;
}

function buildApplicationsPayload(
  fighters: EventApplicationFighterRowDTO[],
  rowStates: Record<string, FighterRowState>,
) {
  const applications: Array<{ fighterId: string; divisionId: string }> = [];
  for (const fighter of fighters) {
    const state = rowStates[fighter.id];
    if (!state?.checked || !state.divisionId) continue;
    if (fighter.appliedDivisionIds.includes(state.divisionId)) continue;
    applications.push({
      fighterId: fighter.id,
      divisionId: state.divisionId,
    });
  }
  return applications;
}

export function GymBulkApplicationForm(props: GymBulkApplicationFormProps) {
  const [rowStates, setRowStates] = useState(() =>
    initialRowStates(props.fighters),
  );

  const [state, formAction, isPending] = useActionState(
    createBulkEventApplicationsAction,
    null as ActionResult<BulkApplyToEventSuccessDTO> | null,
  );

  const selectedCount = useMemo(
    () =>
      buildApplicationsPayload(props.fighters, rowStates).length,
    [props.fighters, rowStates],
  );

  const applicationsJson = useMemo(
    () => JSON.stringify(buildApplicationsPayload(props.fighters, rowStates)),
    [props.fighters, rowStates],
  );

  const updateRow = (
    fighterId: string,
    patch: Partial<FighterRowState>,
  ): void => {
    setRowStates((prev) => ({
      ...prev,
      [fighterId]: { ...prev[fighterId]!, ...patch },
    }));
  };

  if (state?.ok) {
    return <GymBulkApplicationResult result={state.data} />;
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={props.eventId} />
      <input
        type="hidden"
        name="streamingAgreementRequired"
        value={props.streamingAgreementRequired ? "1" : "0"}
      />
      <input type="hidden" name="applicationsJson" value={applicationsJson} />

      {props.hasOfficialTemplate ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          공식 PDF 신청서가 연결된 대회입니다. 아래 일괄 신청은 부문별 일반
          신청·입금 흐름이며, 공식 신청서 묶음과 별도로 진행됩니다.
        </p>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <p className="font-medium">공식 신청서 템플릿 미연결</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            이 대회에는 공식 PDF 신청서 템플릿이 연결되지 않았습니다. 아래에서
            선수별 부문을 선택해 일괄 신청할 수 있습니다.
          </p>
        </div>
      )}

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">선택</TableHead>
              <TableHead>선수</TableHead>
              <TableHead>성별/연령/체중</TableHead>
              <TableHead>신청 부문</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.fighters.map((fighter) => (
              <GymBulkApplicationTableRow
                key={fighter.id}
                fighter={fighter}
                divisions={props.divisions}
                rowState={rowStates[fighter.id]!}
                onCheckedChange={(checked) =>
                  updateRow(fighter.id, { checked })
                }
                onDivisionChange={(divisionId) =>
                  updateRow(fighter.id, { divisionId })
                }
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {props.fighters.map((fighter) => (
          <GymBulkApplicationCard
            key={fighter.id}
            fighter={fighter}
            divisions={props.divisions}
            rowState={rowStates[fighter.id]!}
            onCheckedChange={(checked) => updateRow(fighter.id, { checked })}
            onDivisionChange={(divisionId) =>
              updateRow(fighter.id, { divisionId })
            }
          />
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <ApplicationAgreementChecklist
          streamingAgreementRequired={props.streamingAgreementRequired}
          streamingNoticeText={props.streamingNoticeText}
        />

        <div className="mt-4 grid gap-2">
          <label className="text-sm font-medium" htmlFor="bulk-memo">
            메모 (선택, 공통)
          </label>
          <textarea
            id="bulk-memo"
            name="memo"
            rows={2}
            maxLength={2000}
            className="border-input bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="주최자에게 전달할 참고 사항"
          />
        </div>

        {state && !state.ok ? (
          <p className="text-destructive mt-3 text-sm">{state.error.message}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={selectedCount === 0 || isPending}>
            {isPending
              ? "신청 처리 중…"
              : `선택 선수 일괄 신청 (${selectedCount}명)`}
          </Button>
          <p className="text-muted-foreground text-xs">
            선택 {selectedCount}명 · 필수 동의는 신청 시 스냅샷으로 저장됩니다
          </p>
        </div>
      </div>
    </form>
  );
}
