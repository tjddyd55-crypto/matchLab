"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CORNER_SLOT_STYLES } from "@/lib/corner-slot-styles";

type Corner = "red" | "blue";

/**
 * 승자 선택 — select 대신 홍/청 사각 버튼.
 * form submit 시 hidden input `winnerId`로 전달한다.
 */
export function WinnerCornerPicker({
  fighterRedId,
  fighterBlueId,
  fighterRedName,
  fighterBlueName,
  defaultWinnerId,
  disabled,
  name = "winnerId",
  compact = false,
}: {
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
  defaultWinnerId?: string | null;
  disabled?: boolean;
  name?: string;
  /** 경기 운영 등 high-density */
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(
    defaultWinnerId ?? null,
  );

  const corners: {
    key: Corner;
    label: "홍코너" | "청코너";
    id: string | null;
    name: string;
  }[] = [
    {
      key: "red",
      label: "홍코너",
      id: fighterRedId,
      name: fighterRedName,
    },
    {
      key: "blue",
      label: "청코너",
      id: fighterBlueId,
      name: fighterBlueName,
    },
  ];

  return (
    <div className={cn("space-y-1", compact && "space-y-1")}>
      <p className="text-muted-foreground text-[11px] font-semibold">승자</p>
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        {corners.map((c) => {
          if (!c.id) return null;
          const active = selected === c.id;
          const tone = CORNER_SLOT_STYLES[c.label];
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(active ? null : c.id)}
              className={cn(
                "flex flex-col items-center justify-center rounded-md border px-2 text-center text-xs transition-colors",
                compact ? "min-h-[52px] py-1.5" : "min-h-14 py-2",
                active
                  ? cn(
                      tone.bg,
                      tone.accent,
                      "border-matchon-primary bg-matchon-primary-light/40 ring-1 ring-matchon-primary/40",
                    )
                  : "border-input bg-background hover:bg-muted/40",
              )}
            >
              <span className="text-muted-foreground text-[11px] font-medium">
                {c.label}
              </span>
              <span className="mt-0.5 line-clamp-2 font-semibold leading-snug">
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
