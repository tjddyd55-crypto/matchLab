"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateFighterExternalRecordAction } from "@/features/fighters/actions";
import type { FighterExternalRecord } from "@/lib/fighter-unified-profile/types";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background h-10 w-full rounded-md border px-3 text-sm tabular-nums";

export function FighterExternalRecordForm({
  fighterId,
  initial,
}: {
  fighterId: string;
  initial: FighterExternalRecord;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await updateFighterExternalRecordAction(null, fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-md border border-matchon-border bg-white p-4 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-matchon-text-primary">
          기존/외부 전적
        </h3>
        <p className="mt-1 text-xs text-matchon-text-secondary leading-relaxed">
          MATCHON 외 경기 또는 기존 경기 전적을 입력합니다.
        </p>
      </div>

      <input type="hidden" name="fighterId" value={fighterId} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">승</span>
          <input
            className={inputClass}
            name="wins"
            type="number"
            min={0}
            max={9999}
            step={1}
            required
            defaultValue={initial.wins}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">패</span>
          <input
            className={inputClass}
            name="losses"
            type="number"
            min={0}
            max={9999}
            step={1}
            required
            defaultValue={initial.losses}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">무</span>
          <input
            className={inputClass}
            name="draws"
            type="number"
            min={0}
            max={9999}
            step={1}
            required
            defaultValue={initial.draws}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">NC</span>
          <input
            className={inputClass}
            name="noContests"
            type="number"
            min={0}
            max={9999}
            step={1}
            required
            defaultValue={initial.noContests}
          />
        </label>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
