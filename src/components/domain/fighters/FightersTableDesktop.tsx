import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { GymFighterListRow } from "@/lib/repositories/fighter.repository";
import type { GymFighterPublicSettingsRow } from "@/lib/services/public-fighter.service";
import { GymFighterPublicToggle } from "@/components/domain/fighters/GymFighterPublicToggle";
import { FighterStatus } from "@/lib/enums";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIGHTER_STATUS_LABEL: Record<FighterStatus, string> = {
  active: "활성",
  inactive: "비활성",
  duplicate_review: "중복 검토",
  archived: "보관",
};

export function FightersTableDesktop({
  fighters,
  publicByFighterId = {},
}: {
  fighters: GymFighterListRow[];
  publicByFighterId?: Record<string, GymFighterPublicSettingsRow>;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>선수</TableHead>
            <TableHead>코드</TableHead>
            <TableHead>성별</TableHead>
            <TableHead className="text-right">체중(kg)</TableHead>
            <TableHead className="text-center">전적</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>주최자 공개</TableHead>
            <TableHead>등록일</TableHead>
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
                  <span className="font-medium">{f.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{f.fighterCode}</TableCell>
              <TableCell>{f.gender}</TableCell>
              <TableCell className="text-right">
                {f.weight != null ? f.weight : "—"}
              </TableCell>
              <TableCell className="text-center text-sm">
                {f.recordWin}승 {f.recordLoss}패 {f.recordDraw}무
              </TableCell>
              <TableCell>{FIGHTER_STATUS_LABEL[f.status]}</TableCell>
              <TableCell>
                <GymFighterPublicToggle
                  fighterId={f.id}
                  initialPublic={
                    publicByFighterId[f.id]?.isPublicToOrganizers ?? false
                  }
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {format(f.createdAt, "yyyy.MM.dd", { locale: ko })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
