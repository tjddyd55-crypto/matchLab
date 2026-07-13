import Link from "next/link";
import type { AdminEventListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
import {
  adminDesktopTableClass,
  adminMobileCardClass,
  adminMobileCardFooterClass,
  adminMobileCardHeaderClass,
  adminMobileListClass,
  adminMutedTextClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export function AdminEventsTable({ rows }: { rows: AdminEventListItemDTO[] }) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="대회 데이터가 없습니다"
        description="등록된 대회가 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>대회</TableHead>
              <TableHead>주최</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>일정</TableHead>
              <TableHead>신청/대진</TableHead>
              <TableHead>링크</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium break-words">{e.title}</TableCell>
                <TableCell className={`${adminMutedTextClass} break-words`}>
                  {e.organizerName}
                </TableCell>
                <TableCell>
                  <EventStatusPill status={e.status} />
                </TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap`}>
                  {formatAdminDateTime(e.eventDate)}
                </TableCell>
                <TableCell className={`${adminMutedTextClass} tabular-nums whitespace-nowrap`}>
                  {e.applicationCount} / {e.bracketCount}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={`/organizer/events/${e.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((e) => (
          <li key={e.id}>
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {e.title}
                  </CardTitle>
                  <EventStatusPill status={e.status} />
                </div>
                <p className={`${adminMutedTextClass} text-xs`}>{e.organizerName}</p>
              </CardHeader>
              <CardContent className="pt-3 text-xs">
                <p className={adminMutedTextClass}>
                  {formatAdminDateTime(e.eventDate)} · 신청 {e.applicationCount} · 대진{" "}
                  {e.bracketCount}
                </p>
              </CardContent>
              <CardFooter className={`${adminMobileCardFooterClass} flex flex-wrap gap-2`}>
                <Link
                  href={`/organizer/events/${e.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "field" }),
                    "w-full sm:w-auto",
                  )}
                >
                  운영 화면
                </Link>
                <Link
                  href={`/events/${e.publicSlug}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "field" }),
                    "w-full sm:w-auto",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  공개 공고
                </Link>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
