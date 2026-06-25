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
  DIVISION_TEMPLATE_GENDER_LABELS,
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import {
  groupEventDivisions,
  type AgeGroupDivisionGroup,
  type EventDivisionGroupItem,
} from "@/lib/event-division-grouping";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Div = OrganizerEventDetailVM["divisions"][number];

const inputClass = cn(
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
);

function DivisionRowEditor({ d }: { d: Div }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="divisionId" value={d.id} />
      <input type="hidden" name="ageGroup" value={d.ageGroup ?? ""} />
      <input type="hidden" name="gender" value={d.gender ?? ""} />
      {state?.ok === false ? (
        <p className="text-destructive text-xs">{state.error.message}</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">종목·경기구분</span>
          <input
            name="sportType"
            required
            defaultValue={d.sportType}
            maxLength={120}
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">룰</span>
          <input
            name="ruleType"
            defaultValue={d.ruleType ?? ""}
            maxLength={120}
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">실력</span>
          <input
            name="skillLevel"
            defaultValue={d.skillLevel ?? ""}
            maxLength={120}
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">체급명</span>
          <input
            name="weightClassName"
            defaultValue={d.weightClassName ?? ""}
            maxLength={120}
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">체중 기준</span>
          <input
            name="weightLimitText"
            defaultValue={d.weightLimitText ?? ""}
            maxLength={40}
            placeholder="-30kg"
            className={cn(inputClass, "font-mono")}
          />
        </label>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
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
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        삭제
      </Button>
    </form>
  );
}

function DivisionWeightRow({
  division,
  eventId,
}: {
  division: EventDivisionGroupItem;
  eventId: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background/80 p-3">
      <div className="min-w-0 flex-1">
        <DivisionRowEditor d={division} />
      </div>
      <div className="flex justify-end border-t pt-2">
        <DivisionDeleteButton eventId={eventId} divisionId={division.id} />
      </div>
    </div>
  );
}

function GenderDivisionSection({
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
    <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {divisions.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed bg-muted/10 px-3 py-4 text-center text-xs">
            등록된 체급이 없습니다.
          </p>
        ) : (
          divisions.map((division) => (
            <DivisionWeightRow
              key={division.id}
              division={division}
              eventId={eventId}
            />
          ))
        )}
      </div>
      <EventDivisionForm
        eventId={eventId}
        defaultAgeGroup={defaultAgeGroup}
        defaultGender={gender ?? undefined}
        compact
        sectionLabel={
          gender
            ? `${ageGroup} · ${DIVISION_TEMPLATE_GENDER_LABELS[gender]} 체급 추가`
            : `${ageGroup} · 체급 추가`
        }
      />
    </div>
  );
}

function UnknownGenderSection({
  divisions,
  eventId,
}: {
  divisions: EventDivisionGroupItem[];
  eventId: string;
}) {
  if (divisions.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 p-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        성별 미지정
      </h4>
      <div className="space-y-2">
        {divisions.map((division) => (
          <DivisionWeightRow
            key={division.id}
            division={division}
            eventId={eventId}
          />
        ))}
      </div>
    </div>
  );
}

function AgeGroupDivisionCard({
  group,
  eventId,
}: {
  group: AgeGroupDivisionGroup;
  eventId: string;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{group.ageGroup}</h3>
        <p className="text-muted-foreground text-xs">
          남성/여성 체급을 연령부 단위로 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GenderDivisionSection
          title="남성"
          gender="male"
          ageGroup={group.ageGroup}
          divisions={group.male}
          eventId={eventId}
        />
        <GenderDivisionSection
          title="여성"
          gender="female"
          ageGroup={group.ageGroup}
          divisions={group.female}
          eventId={eventId}
        />
      </div>

      <UnknownGenderSection
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
      className="ring-foreground/10 scroll-mt-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
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
        <p className="text-muted-foreground rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-sm">
          등록된 경기구분이 없습니다. 아래에서 추가하거나 체급표 템플릿을
          불러오세요.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedDivisions.map((group) => (
            <AgeGroupDivisionCard
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
        <EventDivisionForm eventId={eventId} />
      ) : null}
    </section>
  );
}
