import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { GymFighterListRow } from "@/lib/repositories/fighter.repository";
import { FighterStatus } from "@/lib/enums";

const FIGHTER_STATUS_LABEL: Record<FighterStatus, string> = {
  active: "활성",
  inactive: "비활성",
  duplicate_review: "중복 검토",
  archived: "보관",
};

export function FightersCardListMobile({
  fighters,
}: {
  fighters: GymFighterListRow[];
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {fighters.map((f) => (
        <li
          key={f.id}
          className="ring-foreground/10 space-y-2 rounded-xl bg-card p-4 ring-1"
        >
          <div className="flex items-start gap-3">
            {f.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.profileImageUrl}
                alt=""
                className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <div className="bg-muted size-12 shrink-0 rounded-lg ring-1 ring-foreground/10" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-semibold">{f.name}</p>
              <p className="text-muted-foreground font-mono text-xs">
                {f.fighterCode}
              </p>
              <p className="text-muted-foreground text-xs">
                {f.gender} · 체중{" "}
                {f.weight != null ? `${f.weight}kg` : "—"} ·{" "}
                {FIGHTER_STATUS_LABEL[f.status]}
              </p>
              <p className="text-xs">
                전적 {f.recordWin}승 {f.recordLoss}패 {f.recordDraw}무
              </p>
              <p className="text-muted-foreground text-xs">
                등록 {format(f.createdAt, "yyyy.MM.dd", { locale: ko })}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
