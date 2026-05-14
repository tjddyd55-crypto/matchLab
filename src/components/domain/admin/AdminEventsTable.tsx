import Link from "next/link";
import type { AdminEventListItemDTO } from "@/lib/dto/admin";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminEventsTable({ rows }: { rows: AdminEventListItemDTO[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">대회 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">대회</th>
              <th className="py-2 pr-2">주최</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2 pr-2">일정</th>
              <th className="py-2 pr-2">신청/대진</th>
              <th className="py-2">링크</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{e.title}</td>
                <td className="text-muted-foreground py-2 pr-2">{e.organizerName}</td>
                <td className="py-2 pr-2">
                  <EventStatusPill status={e.status} />
                </td>
                <td className="text-muted-foreground py-2 pr-2 whitespace-nowrap">
                  {formatAdminDateTime(e.eventDate)}
                </td>
                <td className="text-muted-foreground py-2 pr-2 whitespace-nowrap">
                  {e.applicationCount} / {e.bracketCount}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={`/organizer/events/${e.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      운영
                    </Link>
                    <Link
                      href={`/events/${e.publicSlug}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      공고
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((e) => (
          <li key={e.id} className="rounded-lg border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{e.title}</span>
              <EventStatusPill status={e.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{e.organizerName}</p>
            <p className="text-muted-foreground text-xs">
              {formatAdminDateTime(e.eventDate)} · 신청 {e.applicationCount} · 대진{" "}
              {e.bracketCount}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/organizer/events/${e.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                운영 화면
              </Link>
              <Link
                href={`/events/${e.publicSlug}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                target="_blank"
                rel="noreferrer"
              >
                공개 공고
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
