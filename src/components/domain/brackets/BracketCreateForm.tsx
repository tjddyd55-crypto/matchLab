"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBracketAction } from "@/features/brackets/actions";
import type { PublicEventDivisionDTO } from "@/lib/dto/public";
import { BracketType } from "@/lib/enums";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
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
  const [state, formAction, pending] = useActionState(
    createBracketAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true && state.data.bracketId) {
      router.push(
        `/organizer/events/${eventId}/brackets/${state.data.bracketId}`,
      );
    }
  }, [state, router, eventId]);

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">대진표 만들기</h2>
      <p className="text-muted-foreground text-sm">
        승인된 신청자만 이후 단계에서 배치할 수 있습니다. 대진 방식은 생성 후
        변경할 수 없습니다.
      </p>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="eventId" value={eventId} />
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">제목</span>
          <input
            name="title"
            required
            maxLength={200}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
            placeholder="예: 남자 라이트급 단판"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">경기구분 (선택)</span>
          <select
            name="divisionId"
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
            )}
            defaultValue=""
          >
            <option value="">전체 · 경기구분 미지정</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {formatDivisionNameLabel(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">대진 방식</span>
          <select
            name="type"
            required
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-sm",
            )}
            defaultValue={BracketType.single_elimination}
          >
            <option value={BracketType.single_elimination}>토너먼트</option>
            <option value={BracketType.match_list}>경기 목록</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "생성 중…" : "대진표 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
