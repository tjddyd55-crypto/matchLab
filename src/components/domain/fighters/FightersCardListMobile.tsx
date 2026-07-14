import Link from "next/link";
import { formatUtcDateOnly } from "@/lib/date-only";
import type { GymFighterTableRow } from "@/components/domain/fighters/FightersTableDesktop";
import type { GymFighterPublicSettingsRow } from "@/lib/services/public-fighter.service";
import {
  FighterProfileStatusBadge,
  resolveFighterProfileStatus,
} from "@/components/domain/fighters/FighterProfileStatusBadge";
import { GymFighterPublicToggle } from "@/components/domain/fighters/GymFighterPublicToggle";
import { FighterStatus } from "@/lib/enums";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIGHTER_STATUS_LABEL: Record<FighterStatus, string> = {
  active: "활성",
  inactive: "비활성",
  duplicate_review: "중복 검토",
  archived: "보관",
};

export function FightersCardListMobile({
  fighters,
  publicByFighterId = {},
  readOnly = false,
}: {
  fighters: GymFighterTableRow[];
  publicByFighterId?: Record<string, GymFighterPublicSettingsRow>;
  readOnly?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {fighters.map((f) => (
        <li
          key={f.id}
          className="ring-foreground/10 space-y-3 rounded-xl bg-card p-4 ring-1"
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
                {f.gender} · {f.ageGroup ?? "—"} ·{" "}
                {formatUtcDateOnly(f.birthDate)}
              </p>
              <p className="text-muted-foreground text-xs">
                {f.phone || "연락처 없음"} · 체중{" "}
                {f.weight != null ? `${f.weight}kg` : "—"}
              </p>
              <p className="text-xs">
                전적 {f.recordWin}승 {f.recordLoss}패 {f.recordDraw}무 ·{" "}
                {FIGHTER_STATUS_LABEL[f.status]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FighterProfileStatusBadge
              status={resolveFighterProfileStatus({
                userId: f.userId,
                hasFighterProfile: f.hasFighterProfile,
                profileIsPublic: f.profileIsPublic,
              })}
              className="text-[10px]"
            />
            {readOnly ? (
              <span className="text-xs text-muted-foreground">
                {(publicByFighterId[f.id]?.isPublicToOrganizers ?? false)
                  ? "공개"
                  : "비공개"}
              </span>
            ) : (
              <GymFighterPublicToggle
                fighterId={f.id}
                initialPublic={
                  publicByFighterId[f.id]?.isPublicToOrganizers ?? false
                }
              />
            )}
          </div>
          {readOnly ? (
            <p className="text-center text-xs text-muted-foreground">
              조회만 가능합니다
            </p>
          ) : (
            <Link
              href={`/gym/fighters/${f.id}/edit`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full",
              )}
            >
              수정
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
