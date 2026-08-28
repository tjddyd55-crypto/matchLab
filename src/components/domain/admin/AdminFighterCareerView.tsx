import Link from "next/link";
import type { FighterCareerProfileView } from "@/lib/fighter-career/types";
import { formatFighterCareerSummary } from "@/lib/fighter-career/types";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  adminContentCardClass,
  adminMutedTextClass,
  adminDesktopTableClass,
  adminMobileListClass,
  adminMobileCardClass,
  adminMobileCardHeaderClass,
} from "@/lib/ui/admin-ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatEventDate(iso: string): string {
  try {
    return formatUtcDateOnly(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function AdminFighterCareerView({
  profile,
}: {
  profile: FighterCareerProfileView;
}) {
  const summary = formatFighterCareerSummary(profile.stats);

  return (
    <div className="space-y-4">
      <div className={adminContentCardClass}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className={adminMutedTextClass}>선수명</dt>
            <dd className="font-medium">{profile.name}</dd>
          </div>
          <div>
            <dt className={adminMutedTextClass}>성별</dt>
            <dd>{profile.gender}</dd>
          </div>
          <div>
            <dt className={adminMutedTextClass}>출생연도</dt>
            <dd>{profile.birthYear ?? "—"}</dd>
          </div>
          <div>
            <dt className={adminMutedTextClass}>현재 소속</dt>
            <dd>{profile.currentGymName ?? "무소속"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={adminMutedTextClass}>Career 전적</dt>
            <dd className="font-semibold tabular-nums">{summary}</dd>
          </div>
          <div>
            <dt className={adminMutedTextClass}>최근 경기</dt>
            <dd>
              {profile.stats.lastMatchAt
                ? formatEventDate(profile.stats.lastMatchAt)
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {profile.records.length === 0 ? (
        <div className={`${adminContentCardClass} ${adminMutedTextClass} text-sm`}>
          Archive 기반 공식 Career 기록이 아직 없습니다. 대회 종료 및 기록
          보관 이후 확정 결과가 반영됩니다.
        </div>
      ) : (
        <>
          <div className={adminDesktopTableClass}>
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow>
                  <TableHead>일자</TableHead>
                  <TableHead>대회</TableHead>
                  <TableHead>상대</TableHead>
                  <TableHead>결과</TableHead>
                  <TableHead>경기구분</TableHead>
                  <TableHead>당시 소속</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {formatEventDate(r.eventDateSnapshot)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">
                      {r.eventNameSnapshot}
                    </TableCell>
                    <TableCell>
                      {r.opponentNameSnapshot ?? "—"}
                      {r.opponentGymNameSnapshot
                        ? ` (${r.opponentGymNameSnapshot})`
                        : ""}
                    </TableCell>
                    <TableCell className="font-medium">{r.resultLabel}</TableCell>
                    <TableCell className={`${adminMutedTextClass} max-w-[140px] truncate`}>
                      {r.divisionLabel ?? "—"}
                    </TableCell>
                    <TableCell className={`${adminMutedTextClass} max-w-[120px] truncate`}>
                      {r.gymNameSnapshot ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className={adminMobileListClass}>
            {profile.records.map((r) => (
              <li key={r.id}>
                <Card className={adminMobileCardClass}>
                  <CardHeader className={adminMobileCardHeaderClass}>
                    <CardTitle className="text-base">{r.eventNameSnapshot}</CardTitle>
                    <p className={`${adminMutedTextClass} text-xs`}>
                      {formatEventDate(r.eventDateSnapshot)}
                      {r.matchNumber != null ? ` · ${r.matchNumber}경기` : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0 text-xs">
                    <p>
                      <span className="font-medium">{r.resultLabel}</span>
                      {" · "}
                      {r.opponentNameSnapshot ?? "—"}
                    </p>
                    <p className={adminMutedTextClass}>
                      {r.divisionLabel ?? "—"} · {r.gymNameSnapshot ?? "—"}
                    </p>
                    {r.resultTypeLabel ? (
                      <p className={adminMutedTextClass}>{r.resultTypeLabel}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={`${adminMutedTextClass} text-xs`}>
        Career 이력은 대회 Archive 확정 결과에서 생성됩니다. 당시 이름·소속은
        snapshot으로 보존되며, 현재 프로필 변경과 무관합니다.
      </p>
    </div>
  );
}

export function AdminFighterCareerBackLink() {
  return (
    <Link
      href="/admin/fighters"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      선수 목록
    </Link>
  );
}
