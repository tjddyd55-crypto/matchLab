import Link from "next/link";
import { formatUtcDateOnly } from "@/lib/date-only";
import type { GymFighterListRow } from "@/lib/repositories/fighter.repository";
import type { GymFighterPublicSettingsRow } from "@/lib/services/public-fighter.service";
import {
  FighterProfileStatusBadge,
  resolveFighterProfileStatus,
} from "@/components/domain/fighters/FighterProfileStatusBadge";
import { GymFighterPublicToggle } from "@/components/domain/fighters/GymFighterPublicToggle";
import { FighterStatus } from "@/lib/enums";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const FIGHTER_STATUS_LABEL: Record<FighterStatus, string> = {
  active: "활성",
  inactive: "비활성",
  duplicate_review: "중복 검토",
  archived: "보관",
};

export type GymFighterTableRow = GymFighterListRow & {
  ageGroup?: string;
};

export function FightersTableDesktop({
  fighters,
  publicByFighterId = {},
  readOnly = false,
}: {
  fighters: GymFighterTableRow[];
  publicByFighterId?: Record<string, GymFighterPublicSettingsRow>;
  readOnly?: boolean;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>선수</TableHead>
            <TableHead>성별</TableHead>
            <TableHead>연령부</TableHead>
            <TableHead>생년월일</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="text-right">체중</TableHead>
            <TableHead className="text-center">전적</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>소속 시작</TableHead>
            <TableHead>계정</TableHead>
            <TableHead>프로필</TableHead>
            <TableHead>주최자 공개</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fighters.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {f.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.profileImageUrl}
                      alt=""
                      className="size-8 rounded-full object-cover ring-1 ring-foreground/10"
                    />
                  ) : (
                    <div className="bg-muted size-8 rounded-full ring-1 ring-foreground/10" />
                  )}
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {f.fighterCode}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{f.gender}</TableCell>
              <TableCell>{f.ageGroup ?? "—"}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {formatUtcDateOnly(f.birthDate)}
              </TableCell>
              <TableCell className="text-xs">{f.phone || "—"}</TableCell>
              <TableCell className="text-right text-sm">
                {f.weight != null ? `${f.weight}kg` : "—"}
              </TableCell>
              <TableCell className="text-center text-sm">
                {f.recordWin}승 {f.recordLoss}패 {f.recordDraw}무
              </TableCell>
              <TableCell>{FIGHTER_STATUS_LABEL[f.status]}</TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {f.affiliationStartDate
                  ? formatUtcDateOnly(f.affiliationStartDate)
                  : "—"}
              </TableCell>
              <TableCell className="text-xs">
                {f.userId ? (
                  <span>
                    {f.loginId ?? "연결됨"}
                    {f.mustChangePassword ? " · 임시PW" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">미발급</span>
                )}
              </TableCell>
              <TableCell>
                <FighterProfileStatusBadge
                  status={resolveFighterProfileStatus({
                    userId: f.userId,
                    hasFighterProfile: f.hasFighterProfile,
                    profileIsPublic: f.profileIsPublic,
                  })}
                  className="whitespace-nowrap text-[10px]"
                />
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                {readOnly ? (
                  <span className="text-xs text-muted-foreground">조회만</span>
                ) : (
                  <Link
                    href={`/gym/fighters/${f.id}/edit`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-7 text-xs",
                    )}
                  >
                    수정
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
