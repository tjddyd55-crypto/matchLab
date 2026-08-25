"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminGymListItemDTO } from "@/lib/dto/admin";
import { formatStoredAdminLoginId } from "@/lib/admin/admin-login-id-label";
import { AdminListEmptyState } from "@/components/domain/admin/AdminListEmptyState";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button } from "@/components/ui/button";
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
import {
  adminDesktopTableClass,
  adminMobileCardClass,
  adminMobileCardHeaderClass,
  adminMobileListClass,
  adminMutedTextClass,
  getAdminGymStatusLabel,
  resolveAdminGymStatusMatchon,
} from "@/lib/ui/admin-ui";

type GymStatusFilter = "all" | "active" | "suspended" | "archived";

const GYM_STATUS_FILTERS: Array<{ id: GymStatusFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "active", label: "정상" },
  { id: "suspended", label: "일시정지" },
  { id: "archived", label: "보관" },
];

export function AdminGymsTable({ rows }: { rows: AdminGymListItemDTO[] }) {
  const [statusFilter, setStatusFilter] = useState<GymStatusFilter>("all");
  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  if (rows.length === 0) {
    return (
      <AdminListEmptyState
        title="체육관 데이터가 없습니다"
        description="등록된 체육관이 없습니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {GYM_STATUS_FILTERS.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="xs"
            variant={statusFilter === f.id ? "default" : "outline"}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <AdminListEmptyState
          title="필터 결과가 없습니다"
          description="다른 상태 필터를 선택해 보세요."
        />
      ) : (
        <>
          <div className={adminDesktopTableClass}>
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>로그인 아이디</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>선수 수</TableHead>
                  <TableHead>등록</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow key={g.id} className="h-12">
                    <TableCell className="font-medium break-words">{g.name}</TableCell>
                    <TableCell className="max-w-[10rem] break-all font-mono text-xs">
                      {formatStoredAdminLoginId(g.loginId)}
                    </TableCell>
                    <TableCell>
                      <MatchonStatusBadge
                        status={resolveAdminGymStatusMatchon(g.status)}
                        label={getAdminGymStatusLabel(g.status)}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">{g.fighterCount}</TableCell>
                    <TableCell className={`${adminMutedTextClass} whitespace-nowrap text-xs`}>
                      {formatAdminDateTime(g.createdAt)}
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/gyms/${g.id}`}
                        className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
                      >
                        상세
                      </Link>
                      {g.loginId && !g.loginId.startsWith("pending-gym-") ? (
                        <Link
                          href={`/admin/password-reset-links?userId=${g.ownerUserId}`}
                          className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
                        >
                          재설정
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className={adminMobileListClass}>
            {filtered.map((g) => (
              <li key={g.id}>
                <Card className={adminMobileCardClass}>
                  <CardHeader className={adminMobileCardHeaderClass}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <MatchonStatusBadge
                        status={resolveAdminGymStatusMatchon(g.status)}
                        label={getAdminGymStatusLabel(g.status)}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 text-xs">
                    <p className={`${adminMutedTextClass} break-all`}>
                      로그인 아이디: {formatStoredAdminLoginId(g.loginId)}
                    </p>
                    <p className={adminMutedTextClass}>선수 {g.fighterCount}명</p>
                    <p className={`${adminMutedTextClass} mt-1`}>
                      {formatAdminDateTime(g.createdAt)}
                    </p>
                    <p className="mt-2">
                      <Link
                        href={`/admin/gyms/${g.id}`}
                        className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                      >
                        상세 보기
                      </Link>
                    </p>
                    {g.loginId && !g.loginId.startsWith("pending-gym-") ? (
                      <p className="mt-1">
                        <Link
                          href={`/admin/password-reset-links?userId=${g.ownerUserId}`}
                          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
                        >
                          비밀번호 재설정 링크 발급
                        </Link>
                      </p>
                    ) : null}
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
