"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEventDivisionAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { normalizeWeightLimitInput } from "@/lib/division-template/division-template-parse";
import {
  DIVISION_TEMPLATE_GENDERS,
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import {
  divisionGenderUiTokens,
  divisionListRowGridClass,
  type DivisionGenderTone,
} from "@/lib/ui/division-gender-ui";
import { Button } from "@/components/ui/button";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";
import { cn } from "@/lib/utils";

const inputClass = formControlFieldCompactClass;

const listAddGridClass = divisionListRowGridClass;

export function EventDivisionForm({
  eventId,
  defaultAgeGroup,
  defaultGender,
  defaultSportType,
  compact = false,
  listVariant = false,
  sectionLabel,
  genderTone,
}: {
  eventId: string;
  defaultAgeGroup?: string;
  defaultGender?: DivisionTemplateGender;
  defaultSportType?: string;
  compact?: boolean;
  listVariant?: boolean;
  sectionLabel?: string;
  genderTone?: DivisionGenderTone;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createEventDivisionAction,
    null as ActionResult<{ divisionId: string }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  const title =
    sectionLabel ??
    (compact ? "체급 추가" : "경기구분 추가");

  if (compact && listVariant) {
    const addRowToken = genderTone
      ? divisionGenderUiTokens[genderTone]
      : null;

    return (
      <form
        action={action}
        className={cn(
          "mt-3 space-y-2 border-t border-dashed pt-3",
          addRowToken?.addRowBorderClassName ?? "border-border/50",
        )}
      >
        <input type="hidden" name="eventId" value={eventId} />
        {defaultAgeGroup ? (
          <input type="hidden" name="ageGroup" value={defaultAgeGroup} />
        ) : null}
        {defaultGender ? (
          <input type="hidden" name="gender" value={defaultGender} />
        ) : null}
        <input
          type="hidden"
          name="sportType"
          value={defaultSportType ?? ""}
        />
        <p className="text-muted-foreground text-xs font-medium">{title}</p>
        {state?.ok === false ? (
          <p className="text-destructive text-xs">{state.error.message}</p>
        ) : null}
        <div className={listAddGridClass}>
          <input
            name="weightClassName"
            maxLength={120}
            aria-label="체급명 (선택)"
            placeholder="체급명 (선택)"
            className={inputClass}
          />
          <input
            name="weightLimitText"
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
          <div className="flex justify-end sm:col-span-2 md:col-span-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "추가 중…" : "체급 추가"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form
      action={action}
      className={cn(
        "grid gap-3 rounded-lg border bg-muted/20 p-3",
        compact ? "md:grid-cols-2" : "md:grid-cols-2",
      )}
    >
      <input type="hidden" name="eventId" value={eventId} />
      {defaultAgeGroup ? (
        <input type="hidden" name="ageGroup" value={defaultAgeGroup} />
      ) : null}
      {defaultGender ? (
        <input type="hidden" name="gender" value={defaultGender} />
      ) : null}
      <h3
        className={cn(
          "font-semibold",
          compact ? "text-xs md:col-span-2" : "text-sm md:col-span-2",
        )}
      >
        {title}
      </h3>
      {state?.ok === false ? (
        <p className="text-destructive text-sm md:col-span-2">
          {state.error.message}
        </p>
      ) : null}
      <label
        className={cn(
          "space-y-1",
          compact ? "text-xs md:col-span-2" : "text-sm md:col-span-2",
        )}
      >
        <span className="text-muted-foreground">종목</span>
        <input
          name="sportType"
          required
          maxLength={120}
          defaultValue={defaultSportType ?? ""}
          className={inputClass}
          placeholder="예: 킥복싱"
        />
      </label>
      {!defaultAgeGroup ? (
        <label className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
          <span className="text-muted-foreground">묶음 이름</span>
          <input
            name="ageGroup"
            maxLength={120}
            className={inputClass}
            placeholder="예: 초등부"
          />
        </label>
      ) : null}
      {!defaultGender ? (
        <label className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
          <span className="text-muted-foreground">성별</span>
          <select name="gender" className={inputClass} defaultValue="">
            <option value="">—</option>
            {DIVISION_TEMPLATE_GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {gender === "male" ? "남성" : "여성"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
        <span className="text-muted-foreground">체급명 (선택)</span>
        <input
          name="weightClassName"
          maxLength={120}
          className={inputClass}
          placeholder="예: 핀급"
        />
      </label>
      <label className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
        <span className="text-muted-foreground">체중 기준 (선택)</span>
        <input
          name="weightLimitText"
          maxLength={40}
          className={cn(inputClass, "font-mono")}
          placeholder="54 · 비우면 제한 없음"
          onBlur={(e) => {
            const normalized = normalizeWeightLimitInput(e.target.value);
            if (normalized !== e.target.value) {
              e.target.value = normalized;
            }
          }}
        />
      </label>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "추가 중…" : compact ? "체급 추가" : "경기구분 추가"}
        </Button>
      </div>
    </form>
  );
}
