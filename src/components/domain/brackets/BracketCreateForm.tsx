"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBracketAction } from "@/features/brackets/actions";
import type { PublicEventDivisionDTO } from "@/lib/dto/public";
import { BracketType } from "@/lib/enums";
import {
  formatDivisionMainLabel,
  resolveDivisionDisplayParts,
} from "@/lib/event-division-fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BracketCreateForm({
  eventId,
  divisions,
}: {
  eventId: string;
  divisions: PublicEventDivisionDTO[];
}) {
  const router = useRouter();
  const [divisionId, setDivisionId] = useState(
    divisions[0]?.id ?? "",
  );
  const [state, formAction, pending] = useActionState(
    createBracketAction,
    null,
  );

  const selectedDivision = useMemo(
    () => divisions.find((d) => d.id === divisionId) ?? null,
    [divisions, divisionId],
  );

  const previewParts = selectedDivision
    ? resolveDivisionDisplayParts(selectedDivision)
    : null;

  useEffect(() => {
    if (state?.ok === true && state.data.bracketId) {
      router.push(
        `/organizer/events/${eventId}/brackets/${state.data.bracketId}`,
      );
    }
  }, [state, router, eventId]);

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">대진표 생성</h2>
      <p className="text-muted-foreground text-sm">
        경기구분을 선택한 뒤 대진 방식을 정합니다. 승인된 신청자만 이후 단계에서
        배치할 수 있으며, 대진 방식은 생성 후 변경할 수 없습니다.
      </p>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="space-y-2 md:col-span-2">
          <label className="block space-y-1 text-sm" htmlFor="bracket-division">
            <span className="text-muted-foreground font-medium">경기구분 / 체급</span>
            <select
              id="bracket-division"
              name="divisionId"
              required
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className={cn(
                "border-input bg-background h-11 w-full rounded-md border px-3 text-base shadow-sm",
              )}
            >
              {divisions.length === 0 ? (
                <option value="">등록된 경기구분이 없습니다</option>
              ) : null}
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatDivisionMainLabel(d)}
                </option>
              ))}
            </select>
          </label>

          {selectedDivision && previewParts ? (
            <div className="bg-muted/40 ring-foreground/10 rounded-lg border p-4 ring-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                선택된 경기구분
              </p>
              <p className="mt-1 text-lg font-semibold leading-snug">
                {[previewParts.ageGroup, previewParts.genderLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {previewParts.weightChipLabel ? (
                <p className="text-foreground mt-0.5 text-base font-medium">
                  {previewParts.weightChipLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground font-medium">대진 방식</span>
          <select
            name="type"
            required
            className={cn(
              "border-input bg-background h-11 w-full rounded-md border px-3 text-base shadow-sm",
            )}
            defaultValue={BracketType.single_elimination}
          >
            <option value={BracketType.single_elimination}>토너먼트</option>
            <option value={BracketType.match_list}>원매치</option>
          </select>
        </label>

        <div className="flex items-end md:col-span-1">
          <Button
            type="submit"
            disabled={pending || divisions.length === 0}
            className="h-11 w-full md:w-auto"
          >
            {pending ? "생성 중…" : "대진표 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
