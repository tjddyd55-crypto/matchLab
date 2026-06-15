"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignCourtDivisionFormAction,
  createEventCourtFormAction,
  deactivateEventCourtFormAction,
} from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { MATCH_CATEGORY_LABEL } from "@/lib/ui-labels/match-category";

export function EventCourtManager({
  eventId,
  courts,
  divisionOptions,
}: {
  eventId: string;
  courts: EventCourtVM[];
  divisionOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setMessage(res.error?.message ?? "처리 실패");
        return;
      }
      setName("");
      router.refresh();
    });
  }

  return (
    <section className="ring-foreground/10 flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h2 className="text-lg font-semibold">경기장 관리</h2>
        <p className="text-muted-foreground text-sm">
          경기장을 추가하고 {MATCH_CATEGORY_LABEL}을 배정하세요. 삭제 대신 비활성 처리합니다.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("eventId", eventId);
          fd.set("name", name);
          run(() => createEventCourtFormAction(fd));
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="경기장 이름 (예: 1번 경기장)"
          className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-md border px-2 text-sm"
          maxLength={100}
        />
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
          경기장 추가
        </Button>
      </form>

      {courts.length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 경기장이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courts.map((court) => (
            <li
              key={court.id}
              className="rounded-lg border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {court.name}
                    {!court.isActive ? (
                      <span className="text-muted-foreground ml-2 text-xs">(비활성)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    순서 {court.sortOrder + 1}
                  </p>
                </div>
                {court.isActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`${court.name}을 비활성 처리할까요?`)) return;
                      const fd = new FormData();
                      fd.set("eventId", eventId);
                      fd.set("courtId", court.id);
                      run(() => deactivateEventCourtFormAction(fd));
                    }}
                  >
                    비활성
                  </Button>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {court.divisions.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-full bg-background px-2 py-0.5 text-xs"
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              {court.isActive && divisionOptions.length > 0 ? (
                <form
                  className="mt-2 flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const divisionId = (
                      form.elements.namedItem("divisionId") as HTMLSelectElement
                    ).value;
                    const fd = new FormData();
                    fd.set("eventId", eventId);
                    fd.set("courtId", court.id);
                    fd.set("divisionId", divisionId);
                    run(() => assignCourtDivisionFormAction(fd));
                  }}
                >
                  <select
                    name="divisionId"
                    className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      {MATCH_CATEGORY_LABEL} 배정
                    </option>
                    {divisionOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" className="h-8 text-xs" disabled={pending}>
                    배정
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {message ? <p className="text-destructive text-xs">{message}</p> : null}
    </section>
  );
}
