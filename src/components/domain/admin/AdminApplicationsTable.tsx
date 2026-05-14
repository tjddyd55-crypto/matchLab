import Link from "next/link";
import type { AdminApplicationListItemDTO } from "@/lib/dto/admin";
import {
  applicationStatusKo,
  paymentStatusKo,
} from "@/components/domain/admin/admin-labels";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminApplicationsTable({
  rows,
}: {
  rows: AdminApplicationListItemDTO[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">신청 데이터가 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-2 pr-2">대회</th>
              <th className="py-2 pr-2">선수</th>
              <th className="py-2 pr-2">체육관</th>
              <th className="py-2 pr-2">신청</th>
              <th className="py-2 pr-2">입금</th>
              <th className="py-2 pr-2">시각</th>
              <th className="py-2">링크</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{a.eventTitle}</td>
                <td className="py-2 pr-2">
                  {a.fighterName}{" "}
                  <span className="text-muted-foreground text-xs">({a.fighterCode})</span>
                </td>
                <td className="text-muted-foreground py-2 pr-2">{a.gymName}</td>
                <td className="py-2 pr-2">{applicationStatusKo(a.status)}</td>
                <td className="py-2 pr-2">{paymentStatusKo(a.paymentStatus)}</td>
                <td className="text-muted-foreground py-2 pr-2 whitespace-nowrap">
                  {formatAdminDateTime(a.createdAt)}
                </td>
                <td className="py-2">
                  <Link
                    href={`/organizer/events/${a.eventId}/applications`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    관리
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((a) => (
          <li key={a.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">{a.eventTitle}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {a.fighterName} ({a.fighterCode}) · {a.gymName}
            </p>
            <p className="mt-1 text-xs">
              신청 {applicationStatusKo(a.status)} · 입금{" "}
              {paymentStatusKo(a.paymentStatus)}
            </p>
            <p className="text-muted-foreground text-xs">{formatAdminDateTime(a.createdAt)}</p>
            <Link
              href={`/organizer/events/${a.eventId}/applications`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex")}
            >
              신청 관리
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
