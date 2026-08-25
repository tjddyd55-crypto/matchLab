"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminAssociationListItemDTO } from "@/lib/dto/admin";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
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
import { eventListFieldInputClass } from "@/lib/ui/event-list-ui";
import {
  adminDesktopTableClass,
  adminMobileCardClass,
  adminMobileCardHeaderClass,
  adminMobileListClass,
  adminMutedTextClass,
  getAdminOrganizerStatusLabel,
  resolveAdminOrganizerStatusMatchon,
} from "@/lib/ui/admin-ui";

function matchesAssociation(row: AdminAssociationListItemDTO, q: string): boolean {
  const hay = [
    row.name,
    row.representativeName,
    row.contactPhone,
    row.contactEmail,
    row.loginId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function AdminAssociationsTable({
  rows,
}: {
  rows: AdminAssociationListItemDTO[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => matchesAssociation(row, q));
  }, [rows, query]);

  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="협회 데이터가 없습니다"
        description="승인된 협회(Organizer type=association)가 없습니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      <label className="block max-w-md space-y-1 text-sm">
        <span className="sr-only">협회 검색</span>
        <input
          type="search"
          value={query}
          placeholder="협회명 · 대표자 · 연락처 검색"
          className={eventListFieldInputClass}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {filtered.length === 0 ? (
        <AdminListEmptyState
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색해 보세요."
        />
      ) : (
        <>
          <div className={adminDesktopTableClass}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>협회명</TableHead>
                  <TableHead>대표자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>연결 체육관</TableHead>
                  <TableHead>크레딧</TableHead>
                  <TableHead>최근 활동</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="h-12">
                    <TableCell className="font-medium break-words">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.representativeName || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.contactPhone || "—"}
                    </TableCell>
                    <TableCell>
                      <MatchonStatusBadge
                        status={resolveAdminOrganizerStatusMatchon(row.status)}
                        label={getAdminOrganizerStatusLabel(row.status)}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell
                      className={`${adminMutedTextClass} whitespace-nowrap text-xs`}
                    >
                      {formatAdminDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.memberGymCount}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.creditBalance.toLocaleString("ko-KR")}C
                    </TableCell>
                    <TableCell
                      className={`${adminMutedTextClass} whitespace-nowrap text-xs`}
                    >
                      {formatAdminDateTime(row.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/associations/${row.id}`}
                        className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
                      >
                        상세
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className={adminMobileListClass}>
            {filtered.map((row) => (
              <li key={row.id}>
                <Card className={adminMobileCardClass}>
                  <CardHeader className={adminMobileCardHeaderClass}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{row.name}</CardTitle>
                      <MatchonStatusBadge
                        status={resolveAdminOrganizerStatusMatchon(row.status)}
                        label={getAdminOrganizerStatusLabel(row.status)}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-3 text-xs">
                    <p className={adminMutedTextClass}>
                      대표자 {row.representativeName || "—"} ·{" "}
                      {row.contactPhone || "연락처 없음"}
                    </p>
                    <p className={adminMutedTextClass}>
                      연결 체육관 {row.memberGymCount} · 크레딧{" "}
                      {row.creditBalance.toLocaleString("ko-KR")}C
                    </p>
                    <p className={adminMutedTextClass}>
                      가입 {formatAdminDateTime(row.createdAt)}
                    </p>
                    <p className="pt-1">
                      <Link
                        href={`/admin/associations/${row.id}`}
                        className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                      >
                        상세 보기
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
