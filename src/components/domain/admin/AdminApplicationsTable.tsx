import Link from "next/link";
import type { AdminApplicationListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge";
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
  adminMobileListClass,
} from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export function AdminApplicationsTable({
  rows,
}: {
  rows: AdminApplicationListItemDTO[];
}) {
  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="신청 데이터가 없습니다"
        description="등록된 신청이 없습니다."
      />
    );
  }

  return (
    <>
      <div className={adminDesktopTableClass}>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>대회</TableHead>
              <TableHead>선수</TableHead>
              <TableHead>체육관</TableHead>
              <TableHead>신청</TableHead>
              <TableHead>입금</TableHead>
              <TableHead>시각</TableHead>
              <TableHead>링크</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium break-words">{a.eventTitle}</TableCell>
                <TableCell className="break-words">
                  {a.fighterName}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({a.fighterCode})
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground break-words">
                  {a.gymName}
                </TableCell>
                <TableCell>
                  <ApplicationStatusBadge status={a.status} />
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={a.paymentStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatAdminDateTime(a.createdAt)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/organizer/events/${a.eventId}/applications`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    관리
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className={adminMobileListClass}>
        {rows.map((a) => (
          <li key={a.id}>
            <Card className="gap-0 overflow-hidden py-0">
              <CardHeader className="border-b bg-muted/15 pb-3">
                <CardTitle className="line-clamp-2 text-base leading-snug">
                  {a.eventTitle}
                </CardTitle>
                <p className="text-muted-foreground text-xs break-words">
                  {a.fighterName} ({a.fighterCode}) · {a.gymName}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                <div className="flex flex-wrap gap-2">
                  <ApplicationStatusBadge status={a.status} />
                  <PaymentStatusBadge status={a.paymentStatus} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatAdminDateTime(a.createdAt)}
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/10 pt-3">
                <Link
                  href={`/organizer/events/${a.eventId}/applications`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "field" }),
                    "w-full",
                  )}
                >
                  신청 관리
                </Link>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
