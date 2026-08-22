"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
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
import { normalizeWeightLimitInput } from "@/lib/division-template/division-template-parse";
import { formatDivisionSportTitle } from "@/lib/event-division-fields";
import {
  divisionAgeGroupSectionClass,
  divisionGenderColumnDividerClass,
  divisionGenderUiTokens,
  divisionListHeaderBaseClass,
  divisionListRowBaseClass,
  type DivisionGenderTone,
} from "@/lib/ui/division-gender-ui";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

type Div = OrganizerEventDetailVM["divisions"][number];

const inputClass = formControlFieldCompactClass;

function resolveAgeGroupSportType(group: AgeGroupDivisionGroup): string {
  const all = [...group.male, ...group.female, ...group.unknown];
  return all.find((d) => d.sportType?.trim())?.sportType?.trim() ?? "";
}

function DivisionListHeader({ tone }: { tone: DivisionGenderTone }) {
  const token = divisionGenderUiTokens[tone];

  return (
    <div className={cn(divisionListHeaderBaseClass, token.listHeaderClassName)}>
      <span>체급명 (선택)</span>
      <span>체중 기준 (선택)</span>
      <span className="text-right">동작</span>
    </div>
  );
}

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
        <input type="hidden" name="sportType" value={d.sportType ?? ""} />
        <input type="hidden" name="ruleType" value={d.ruleType ?? ""} />
        <input type="hidden" name="skillLevel" value={d.skillLevel ?? ""} />
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">체급명 (선택)</span>
          <input
            name="weightClassName"
            defaultValue={d.weightClassName ?? ""}
            maxLength={120}
            className={inputClass}
            placeholder="예: 플라이급"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">체중 기준 (선택)</span>
          <input
            name="weightLimitText"
            defaultValue={d.weightLimitText ?? ""}
            maxLength={40}
            placeholder="54 · 비우면 제한 없음"
            className={cn(inputClass, "font-mono")}
            onBlur={(e) => {
              const normalized = normalizeWeightLimitInput(e.target.value);
              if (normalized !== e.target.value) {
                e.target.value = normalized;
              }
            }}
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
  /** @deprecated row actions always use Button size="sm" */
  compact?: boolean;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const deleteConfirmedRef = useRef(false);
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
        if (deleteConfirmedRef.current) {
          deleteConfirmedRef.current = false;
          return;
        }
        e.preventDefault();
        const form = e.currentTarget;
        void (async () => {
          const ok = await confirm({
            title: "이 경기구분을 삭제할까요?",
            description:
              "신청·대진표가 연결된 경기구분은 삭제되지 않습니다.",
            confirmLabel: "삭제",
            variant: "danger",
          });
          if (!ok) return;
          deleteConfirmedRef.current = true;
          form.requestSubmit();
        })();
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
        variant="outline"
        disabled={pending}
      >
        삭제
      </Button>
    </form>
  );
}

function DivisionWeightRow({
  division,
  eventId,
  layout = "list",
}: {
  division: EventDivisionGroupItem;
  eventId: string;
  layout?: "stack" | "list";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateEventDivisionAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  if (layout === "list") {
    const formId = `division-edit-${division.id}`;

    return (
      <div className={divisionListRowBaseClass}>
        <form id={formId} action={action} className="contents">
          <input type="hidden" name="divisionId" value={division.id} />
          <input type="hidden" name="ageGroup" value={division.ageGroup ?? ""} />
          <input type="hidden" name="gender" value={division.gender ?? ""} />
          {state?.ok === false ? (
            <p className="text-destructive col-span-full text-xs">{state.error.message}</p>
          ) : null}
          <input type="hidden" name="sportType" value={division.sportType ?? ""} />
          <input
            name="weightClassName"
            defaultValue={division.weightClassName ?? ""}
            maxLength={120}
            aria-label="체급명 (선택)"
            placeholder="체급명 (선택)"
            className={inputClass}
          />
          <input
            name="weightLimitText"
            defaultValue={division.weightLimitText ?? ""}
            maxLength={40}
            aria-label="체중 기준 (선택)"
            placeholder="54 · 비우면 제한 없음"
            className={cn(inputClass, "font-mono")}
            onBlur={(e) => {
              const normalized = normalizeWeightLimitInput(e.target.value);
              if (normalized !== e.target.value) {
                e.target.value = normalized;
              }
            }}
          />
          <input type="hidden" name="ruleType" value={division.ruleType ?? ""} />
          <input
            type="hidden"
            name="skillLevel"
            value={division.skillLevel ?? ""}
          />
        </form>
        <div className="flex justify-end gap-1">
          <Button
            type="submit"
            form={formId}
            size="sm"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "…" : "저장"}
          </Button>
          <DivisionDeleteButton
            eventId={eventId}
            divisionId={division.id}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-[var(--division-section-divider)] py-3 last:border-b-0">
      <DivisionRowEditor d={division} />
      <div className="flex justify-end">
        <DivisionDeleteButton eventId={eventId} divisionId={division.id} />
      </div>
    </div>
  );
}

function GenderDivisionSection({
  tone,
  gender,
  ageGroup,
  divisions,
  eventId,
  defaultSportType,
  className,
}: {
  tone: DivisionGenderTone;
  gender: DivisionTemplateGender | null;
  ageGroup: string;
  divisions: EventDivisionGroupItem[];
  eventId: string;
  defaultSportType: string;
  className?: string;
}) {
  const token = divisionGenderUiTokens[tone];
  const defaultAgeGroup =
    ageGroup === "(연령부 미지정)" ? undefined : ageGroup;
  const genderLabel = gender
    ? DIVISION_TEMPLATE_GENDER_LABELS[gender]
    : token.label;

  return (
    <div className={cn(token.columnClassName, "space-y-0", className)}>
      <div className={token.headerClassName}>
        <span className={token.headerAccentClassName} aria-hidden />
        <h4>{genderLabel}</h4>
      </div>

      <div className="px-1 pb-1 pt-2">
        {divisions.length === 0 ? (
          <p className="text-muted-foreground py-2 text-xs">
            등록된 체급이 없습니다.
          </p>
        ) : (
          <div>
            <DivisionListHeader tone={tone} />
            {divisions.map((division) => (
              <DivisionWeightRow
                key={division.id}
                division={division}
                eventId={eventId}
                layout="list"
              />
            ))}
          </div>
        )}

        <EventDivisionForm
          eventId={eventId}
          defaultAgeGroup={defaultAgeGroup}
          defaultGender={gender ?? undefined}
          defaultSportType={defaultSportType}
          compact
          listVariant
          genderTone={tone}
          sectionLabel={
            gender
              ? `${ageGroup} · ${DIVISION_TEMPLATE_GENDER_LABELS[gender]} 체급 추가`
              : `${ageGroup} · 체급 추가`
          }
        />
      </div>
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

  const token = divisionGenderUiTokens.unknown;

  return (
    <div
      className={cn(
        token.columnClassName,
        "mt-6 space-y-0 border-t border-dashed border-[var(--division-section-divider)] pt-6",
      )}
    >
      <div className={token.headerClassName}>
        <span className={token.headerAccentClassName} aria-hidden />
        <h4>{token.label}</h4>
      </div>

      <div className="space-y-2 px-1 pb-1 pt-2">
        {divisions.map((division) => (
          <DivisionWeightRow
            key={division.id}
            division={division}
            eventId={eventId}
            layout="stack"
          />
        ))}
      </div>
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
  const defaultSportType = resolveAgeGroupSportType(group);
  const sportTitle = formatDivisionSportTitle({ sportType: defaultSportType });

  return (
    <section className={divisionAgeGroupSectionClass}>
      <div className="space-y-1 border-b border-[var(--division-section-divider)] pb-4">
        <h3 className="text-lg font-semibold tracking-tight">{group.ageGroup}</h3>
        {sportTitle ? (
          <p className="text-muted-foreground text-xs">{sportTitle}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          남성/여성 체급을 연령부 단위로 관리합니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-0">
        <GenderDivisionSection
          tone="male"
          gender="male"
          ageGroup={group.ageGroup}
          divisions={group.male}
          eventId={eventId}
          defaultSportType={defaultSportType}
        />
        <div
          className={divisionGenderColumnDividerClass}
          role="separator"
          aria-orientation="vertical"
        />
        <GenderDivisionSection
          tone="female"
          gender="female"
          ageGroup={group.ageGroup}
          divisions={group.female}
          eventId={eventId}
          defaultSportType={defaultSportType}
          className="border-t border-[var(--division-section-divider)] pt-6 xl:border-t-0 xl:pt-0"
        />
      </div>

      <UnknownGenderSection divisions={group.unknown} eventId={eventId} />
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

      <ApplyDivisionTemplatePanel
        eventId={eventId}
        templates={templates.map((t) => ({
          id: t.id,
          title: t.title,
          sportType: t.sportType,
        }))}
        templateDetails={templateDetails}
        divisionsForResolve={divisions.map((d) => ({
          id: d.id,
          label: [d.ageGroup, d.gender, d.weightClassName ?? d.weightClass]
            .filter(Boolean)
            .join(" · "),
          gender: d.gender,
          ageGroup: d.ageGroup,
          weightClass: d.weightClass,
          weightClassName: d.weightClassName,
          weightLimitText: d.weightLimitText,
        }))}
      />

      <div className="space-y-4 border-t border-[var(--division-section-divider)] pt-6">
        {divisions.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-sm">
            등록된 경기구분이 없습니다. 위에서 체급표 템플릿을 불러오거나
            아래에서 직접 추가하세요.
          </p>
        ) : (
          <div className="space-y-10">
            {groupedDivisions.map((group) => (
              <AgeGroupDivisionSection
                key={group.ageGroup}
                group={group}
                eventId={eventId}
              />
            ))}
          </div>
        )}
      </div>

      {divisions.length === 0 ? (
        <EventDivisionForm eventId={eventId} />
      ) : null}
    </section>
  );
}
