"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEventDivisionAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import {
  DIVISION_TEMPLATE_GENDERS,
  type DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LIST_ROW_GRID =
  "grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.65fr)_minmax(0,0.65fr)_auto] lg:items-center";

const cellInputClass = cn(
  "border-input bg-background h-8 w-full min-w-0 rounded-md border px-2 text-xs shadow-sm",
);

const sportInputClass = cn(cellInputClass, "text-muted-foreground");

export function EventDivisionForm({
  eventId,
  defaultAgeGroup,
  defaultGender,
  variant = "default",
  sectionLabel,
}: {
  eventId: string;
  defaultAgeGroup?: string;
  defaultGender?: DivisionTemplateGender;
  variant?: "default" | "list";
  sectionLabel?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createEventDivisionAction,
    null as ActionResult<{ divisionId: string }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  const isList = variant === "list";
  const title = sectionLabel ?? (isList ? "체급 추가" : "경기구분 추가");

  if (isList) {
    return (
      <div className="mt-2 border-t border-dashed border-border/50 pt-3">
        <p className="text-muted-foreground mb-2 text-xs font-medium">{title}</p>
        <form action={action} className={LIST_ROW_GRID}>
          <input type="hidden" name="eventId" value={eventId} />
          {defaultAgeGroup ? (
            <input type="hidden" name="ageGroup" value={defaultAgeGroup} />
          ) : null}
          {defaultGender ? (
            <input type="hidden" name="gender" value={defaultGender} />
          ) : null}
          <input
            name="sportType"
            required
            maxLength={120}
            className={sportInputClass}
            placeholder="종목"
            aria-label="종목·경기구분"
          />
          <input
            name="weightClassName"
            maxLength={120}
            className={cellInputClass}
            placeholder="체급명"
            aria-label="체급명"
          />
          <input
            name="weightLimitText"
            maxLength={40}
            className={cn(cellInputClass, "font-mono")}
            placeholder="-30kg"
            aria-label="체중 기준"
          />
          <input
            name="ruleType"
            maxLength={120}
            className={cellInputClass}
            placeholder="룰"
            aria-label="룰"
          />
          <input
            name="skillLevel"
            maxLength={120}
            className={cellInputClass}
            placeholder="실력"
            aria-label="실력"
          />
          <div className="flex items-center justify-end sm:col-span-2 lg:col-span-1">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={pending}
            >
              {pending ? "추가 중…" : "추가"}
            </Button>
          </div>
        </form>
        {state?.ok === false ? (
          <p className="text-destructive mt-1 text-xs">{state.error.message}</p>
        ) : null}
      </div>
    );
  }

  const inputClass = cn(
    "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
  );

  return (
    <form
      action={action}
      className="grid gap-3 border-t border-border/60 pt-4 md:grid-cols-2"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <h3 className="text-sm font-semibold md:col-span-2">{title}</h3>
      {state?.ok === false ? (
        <p className="text-destructive text-sm md:col-span-2">
          {state.error.message}
        </p>
      ) : null}
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="text-muted-foreground">종목·경기구분명</span>
        <input
          name="sportType"
          required
          maxLength={120}
          className={inputClass}
          placeholder="예: 킥복싱 무에타이"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">룰</span>
        <input name="ruleType" maxLength={120} className={inputClass} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">연령부</span>
        <input
          name="ageGroup"
          maxLength={120}
          className={inputClass}
          placeholder="예: 초등부"
        />
      </label>
      <label className="space-y-1 text-sm">
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
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">체급명</span>
        <input
          name="weightClassName"
          maxLength={120}
          className={inputClass}
          placeholder="예: 핀급"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">체중 기준</span>
        <input
          name="weightLimitText"
          maxLength={40}
          className={cn(inputClass, "font-mono")}
          placeholder="-30kg"
        />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="text-muted-foreground">실력</span>
        <input name="skillLevel" maxLength={120} className={inputClass} />
      </label>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "추가 중…" : "경기구분 추가"}
        </Button>
      </div>
    </form>
  );
}
