"use client";

import { useMemo, useState } from "react";
import type { GymFighterListRow } from "@/lib/repositories/fighter.repository";
import type { GymFighterPublicSettingsRow } from "@/lib/services/public-fighter.service";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";
import { FightersTableDesktop } from "@/components/domain/fighters/FightersTableDesktop";
import { FightersCardListMobile } from "@/components/domain/fighters/FightersCardListMobile";

export function GymFightersListClient({
  fighters,
  publicByFighterId,
}: {
  fighters: GymFighterListRow[];
  publicByFighterId: Record<string, GymFighterPublicSettingsRow>;
}) {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");

  const filtered = useMemo(() => {
    return fighters.filter((f) => {
      if (gender && f.gender !== gender) return false;
      if (q) {
        const hay = `${f.name} ${f.fighterCode} ${f.phone}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [fighters, q, gender]);

  const enriched = useMemo(
    () =>
      filtered.map((f) => ({
        ...f,
        ageGroup: publicAgeGroupFromBirthDate(f.birthDate),
      })),
    [filtered],
  );

  const inputClass =
    "border-input bg-background h-9 w-full rounded-md border px-2 text-sm sm:max-w-xs";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span className="font-medium">검색</span>
          <input
            className={inputClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름, 코드, 연락처"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">성별</span>
          <select
            className={inputClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">전체</option>
            <option value="male">남</option>
            <option value="female">여</option>
          </select>
        </label>
      </div>
      <p className="text-muted-foreground text-sm">
        활성 소속 선수 {filtered.length}명
      </p>
      <FightersTableDesktop
        fighters={enriched}
        publicByFighterId={publicByFighterId}
      />
      <FightersCardListMobile
        fighters={enriched}
        publicByFighterId={publicByFighterId}
      />
    </div>
  );
}
