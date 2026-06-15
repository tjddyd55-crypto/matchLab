import Link from "next/link";
import {
  publishBracketFormAction,
  unpublishBracketFormAction,
} from "@/features/brackets/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { BracketStatusBadge } from "@/components/domain/brackets/BracketStatusBadge";
import { BracketTypeBadge } from "@/components/domain/brackets/BracketTypeBadge";
import type { OrganizerBracketListItemVM } from "@/lib/services/bracket.service";
import { cn } from "@/lib/utils";

export function OrganizerBracketList({
  eventId,
  brackets,
}: {
  eventId: string;
  brackets: OrganizerBracketListItemVM[];
}) {
  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-medium uppercase">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">경기구분</th>
              <th className="px-4 py-3">대진 방식</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">공개</th>
              <th className="px-4 py-3">경기 수</th>
              <th className="px-4 py-3 text-right">동작</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{b.title}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {b.divisionLabel ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <BracketTypeBadge type={b.type} />
                </td>
                <td className="px-4 py-3">
                  <BracketStatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3">{b.isPublic ? "예" : "아니오"}</td>
                <td className="px-4 py-3">{b.matchCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/organizer/events/${eventId}/brackets/${b.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      관리
                    </Link>
                    {!b.isPublic ? (
                      <form action={publishBracketFormAction}>
                        <input type="hidden" name="bracketId" value={b.id} />
                        <Button size="sm" type="submit">
                          공개
                        </Button>
                      </form>
                    ) : (
                      <form action={unpublishBracketFormAction}>
                        <input type="hidden" name="bracketId" value={b.id} />
                        <Button size="sm" variant="secondary" type="submit">
                          비공개
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {brackets.map((b) => (
          <div
            key={b.id}
            className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{b.title}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {b.divisionLabel ?? "경기구분 미지정"}
                </div>
              </div>
              <BracketStatusBadge status={b.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <BracketTypeBadge type={b.type} />
              <span className="text-muted-foreground text-xs">
                공개 {b.isPublic ? "예" : "아니오"} · 경기 {b.matchCount}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/organizer/events/${eventId}/brackets/${b.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                관리
              </Link>
              {!b.isPublic ? (
                <form action={publishBracketFormAction}>
                  <input type="hidden" name="bracketId" value={b.id} />
                  <Button size="sm" type="submit">
                    공개
                  </Button>
                </form>
              ) : (
                <form action={unpublishBracketFormAction}>
                  <input type="hidden" name="bracketId" value={b.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    비공개
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
