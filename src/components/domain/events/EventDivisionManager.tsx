"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEventDivisionAction,
  updateEventDivisionAction,
} from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { EventStatus } from "@/lib/enums";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import type {
  DivisionTemplateListItemVM,
  DivisionTemplateDetailVM,
} from "@/lib/services/division-template.service";
import { ApplyDivisionTemplatePanel } from "@/components/domain/division-templates/ApplyDivisionTemplatePanel";
import { EventDivisionForm } from "@/components/domain/events/EventDivisionForm";
import {
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import {
  groupEventDivisions,
  type AgeGroupDivisionGroup,
  type EventDivisionGroupItem,
} from "@/lib/event-division-grouping";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** PC 리스트 row / 헤더 공통 그리드 */
const LIST_ROW_GRID =
  "grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.65fr)_minmax(0,0.65fr)_auto] lg:items-center";

const cellInputClass = cn(
  "border-input bg-background h-8 w-full min-w-0 rounded-md border px-2 text-xs shadow-sm",
);

const sportInputClass = cn(cellInputClass, "text-muted-foreground");

function DivisionListHeader() {
  return (
    <div
      className={cn(
        LIST_ROW_GRID,
        "text-muted-foreground hidden border-b border-border/50 px-1 pb-2 text-xs font-medium lg:grid",
      )}
      aria-hidden
    >
      <span>종목</span>
      <span>체급명</span>
      <span>체중 기준</span>
      <span>룰</span>
      <span>실력</span>
      <span className="text-right">동작</span>
    </div>
  );
}

function DivisionDeleteButton({
  eventId,
  divisionId,
}: {
  eventId: string;
  divisionId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    deleteEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "이 경기구분을 삭제할까요? 신청·대진표가 연결된 경기구분은 삭제되지 않습니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="divisionId" value={divisionId} />
      {state?.ok === false ? (
        <p className="text-destructive mb-1 text-xs">{state.error.message}</p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs"
        disabled={pending}
      >
        삭제
      </Button>
    </form>
  );
}

function DivisionListRow({
  division,
  eventId,
}: {
  division: EventDivisionGroupItem;
  eventId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <div className="group border-b border-border/50 px-1 py-2 transition-colors hover:bg-muted/25">
      <form action={action} className={LIST_ROW_GRID}>
        <input type="hidden" name="divisionId" value={division.id} />
        <input type="hidden" name="ageGroup" value={division.ageGroup ?? ""} />
        <input type="hidden" name="gender" value={division.gender ?? ""} />
        <input
          name="sportType"
          required
          defaultValue={division.sportType}
          maxLength={120}
          className={sportInputClass}
          aria-label="종목·경기구분"
        />
        <input
          name="weightClassName"
          defaultValue={division.weightClassName ?? ""}
          maxLength={120}
          className={cellInputClass}
          aria-label="체급명"
        />
        <input
          name="weightLimitText"
          defaultValue={division.weightLimitText ?? ""}
          maxLength={40}
          placeholder="-30kg"
          className={cn(cellInputClass, "font-mono")}
          aria-label="체중 기준"
        />
        <input
          name="ruleType"
          defaultValue={division.ruleType ?? ""}
          maxLength={120}
          className={cellInputClass}
          aria-label="룰"
        />
        <input
          name="skillLevel"
          defaultValue={division.skillLevel ?? ""}
          maxLength={120}
          className={cellInputClass}
          aria-label="실력"
        />
        <div className="flex items-center justify-end gap-1 sm:col-span-2 lg:col-span-1">
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            className="h-8 px-2 text-xs"
            disabled={pending}
          >
            {pending ? "…" : "저장"}
          </Button>
          <DivisionDeleteButton eventId={eventId} divisionId={division.id} />
        </div>
      </form>
      {state?.ok === false ? (
        <p className="text-destructive mt-1 px-1 text-xs">{state.error.message}</p>
      ) : null}
    </div>
  );
}

function GenderDivisionColumn({
  title,
  gender,
  ageGroup,
  divisions,
  eventId,
}: {
  title: string;
  gender: DivisionTemplateGender | null;
  ageGroup: string;
  divisions: EventDivisionGroupItem[];
  eventId: string;
}) {
  const defaultAgeGroup =
    ageGroup === "(연령부 미지정)" ? undefined : ageGroup;

  return (
    <div className="min-w-0 space-y-2 xl:px-4 xl:first:pl-0 xl:last:pr-0">
      <h4 className="border-b border-border/40 pb-2 text-sm font-semibold">
        {title}
      </h4>

      {divisions.length === 0 ? (
        <p className="text-muted-foreground py-3 text-center text-xs">
          등록된 체급이 없습니다.
        </p>
      ) : (
        <div>
          <DivisionListHeader />
          {divisions.map((division) => (
            <DivisionListRow
              key={division.id}
              division={division}
              eventId={eventId}
            />
          ))}
        </div>
      )}

      <EventDivisionForm
        eventId={eventId}
        defaultAgeGroup={defaultAgeGroup}
        defaultGender={gender ?? undefined}
        variant="list"
        sectionLabel="체급 추가"
      />
    </div>
  );
}

function UnknownGenderSection({
  divisions,
  eventId,
  ageGroup,
}: {
  divisions: EventDivisionGroupItem[];
  eventId: string;
  ageGroup: string;
}) {
  if (divisions.length === 0) return null;

  const defaultAgeGroup =
    ageGroup === "(연령부 미지정)" ? undefined : ageGroup;

  return (
    <div className="space-y-2 border-t border-dashed border-border/50 pt-4">
      <h4 className="text-muted-foreground text-sm font-medium">성별 미지정</h4>
      <DivisionListHeader />
      {divisions.map((division) => (
        <DivisionListRow
          key={division.id}
          division={division}
          eventId={eventId}
        />
      ))}
      <EventDivisionForm
        eventId={eventId}
        defaultAgeGroup={defaultAgeGroup}
        variant="list"
        sectionLabel="체급 추가"
      />
    </div>
  );
}

function AgeGroupDivisionSection({
  group,
  eventId,
}: {
  group: AgeGroupDivisionGroup;
  eventId: string;
}) {
  return (
    <section className="space-y-4 border-b border-border/60 pb-8 last:border-b-0 last:pb-0">
      <div className="space-y-0.5">
        <h3 className="text-lg font-semibold tracking-tight">{group.ageGroup}</h3>
        <p className="text-muted-foreground text-xs">
          남성/여성 체급을 연령부 단위로 관리합니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 xl:gap-0 xl:divide-x xl:divide-border/40">
        <GenderDivisionColumn
          title="남성"
          gender="male"
          ageGroup={group.ageGroup}
          divisions={group.male}
          eventId={eventId}
        />
        <GenderDivisionColumn
          title="여성"
          gender="female"
          ageGroup={group.ageGroup}
          divisions={group.female}
          eventId={eventId}
        />
      </div>

      <UnknownGenderSection
        ageGroup={group.ageGroup}
        divisions={group.unknown}
        eventId={eventId}
      />
    </section>
  );
}

export function EventDivisionManager({
  eventId,
  status,
  divisions,
  templates,
  templateDetails,
}: {
  eventId: string;
  status: EventStatus;
  divisions: OrganizerEventDetailVM["divisions"];
  templates: DivisionTemplateListItemVM[];
  templateDetails: DivisionTemplateDetailVM[];
}) {
  const groupedDivisions = useMemo(
    () => groupEventDivisions(divisions),
    [divisions],
  );

  return (
    <section
      id="setup-divisions"
      className="ring-foreground/10 scroll-mt-24 space-y-6 rounded-xl border bg-card p-4 shadow-sm md:p-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">경기구분 (디비전)</h2>
        {status === EventStatus.open ? (
          <p className="text-muted-foreground text-xs">
            신청 공개 중에는 마지막 경기구분을 삭제할 수 없습니다.
          </p>
        ) : null}
      </div>

      {divisions.length === 0 ? (
        <p className="text-muted-foreground border-b border-dashed border-border/60 py-8 text-center text-sm">
          등록된 경기구분이 없습니다. 아래에서 추가하거나 체급표 템플릿을
          불러오세요.
        </p>
      ) : (
        <div className="space-y-8">
          {groupedDivisions.map((group) => (
            <AgeGroupDivisionSection
              key={group.ageGroup}
              group={group}
              eventId={eventId}
            />
          ))}
        </div>
      )}

      <ApplyDivisionTemplatePanel
        eventId={eventId}
        templates={templates.map((t) => ({
          id: t.id,
          title: t.title,
          sportType: t.sportType,
        }))}
        templateDetails={templateDetails}
      />

      {divisions.length === 0 ? (
        <EventDivisionForm eventId={eventId} variant="default" />
      ) : null}
    </section>
  );
}
