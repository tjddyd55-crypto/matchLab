import Link from "next/link";
import type { AdminApplicationListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
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
  applicationStatusKo,
  paymentStatusKo,
  resolveAdminApplicationMatchonStatus,
  resolveAdminPaymentMatchonStatus,
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
                  <span className={`${adminMutedTextClass} text-xs`}>
                    ({a.fighterCode})
                  </span>
                </TableCell>
                <TableCell className={`${adminMutedTextClass} break-words`}>
                  {a.gymName}
                </TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminApplicationMatchonStatus(a.status)}
                    label={applicationStatusKo(a.status)}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <MatchonStatusBadge
                    status={resolveAdminPaymentMatchonStatus(a.paymentStatus)}
                    label={paymentStatusKo(a.paymentStatus)}
                    size="sm"
                  />
                </TableCell>
                <TableCell className={`${adminMutedTextClass} whitespace-nowrap`}>
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
            <Card className={adminMobileCardClass}>
              <CardHeader className={adminMobileCardHeaderClass}>
                <CardTitle className="line-clamp-2 text-base leading-snug">
                  {a.eventTitle}
                </CardTitle>
                <p className={`${adminMutedTextClass} text-xs break-words`}>
                  {a.fighterName} ({a.fighterCode}) · {a.gymName}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                <div className="flex flex-wrap gap-2">
                  <MatchonStatusBadge
                    status={resolveAdminApplicationMatchonStatus(a.status)}
                    label={applicationStatusKo(a.status)}
                    size="sm"
                  />
                  <MatchonStatusBadge
                    status={resolveAdminPaymentMatchonStatus(a.paymentStatus)}
                    label={paymentStatusKo(a.paymentStatus)}
                    size="sm"
                  />
                </div>
                <p className={`${adminMutedTextClass} text-xs`}>
                  {formatAdminDateTime(a.createdAt)}
                </p>
              </CardContent>
              <CardFooter className={adminMobileCardFooterClass}>
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
