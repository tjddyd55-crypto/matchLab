"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BulkSmsComposeDialog } from "@/components/domain/messaging/BulkSmsComposeDialog";
import {
  previewAssociationBulkSmsAction,
  sendAssociationBulkSmsAction,
} from "@/features/messaging/bulk-sms-actions";
import { MEMBER_GYM_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL } from "@/lib/ui-labels/member-gym-owner";
import type { AssociationMemberGymStatus } from "@/lib/enums";

type MemberGymRow = {
  id: string;
  memberCode: string;
  status: AssociationMemberGymStatus;
  approvedAt: string | null;
  ownerAccessSuspendedAt: string | null;
  ownerInviteTokenHash: string | null;
  ownerInviteExpiresAt: string | null;
  gym: {
    name: string;
    ownerUser: {
      authUserId: string | null;
    } | null;
    fighters: { id: string }[];
    _count: { fighters: number };
  };
  accountStatus: keyof typeof MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL;
};

export function MemberGymListWithBulkSms({
  rows,
  totalCount,
}: {
  rows: MemberGymRow[];
  totalCount: number;
}) {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const hasFilters = Boolean(status || q?.trim());

  const scope = useMemo(() => {
    if (selectedIds.size > 0) return "selected" as const;
    if (hasFilters) return "filtered" as const;
    return "all" as const;
  }, [selectedIds.size, hasFilters]);

  const selectionLabel =
    selectedIds.size > 0
      ? `선택 ${selectedIds.size}곳`
      : hasFilters
        ? `현재 필터 결과`
        : `전체 회원사 (${totalCount}곳)`;

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          문자 보내기
        </Button>
        {selectedIds.size > 0 ? (
          <span className="text-sm text-matchon-text-secondary">
            {selectedIds.size}곳 선택
          </span>
        ) : null}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-md border border-matchon-border md:block">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  aria-label="전체 선택"
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? new Set(rows.map((r) => r.id)) : new Set(),
                    )
                  }
                />
              </th>
              <th className="px-3 py-2">회원사명</th>
              <th className="px-3 py-2">회원사 코드</th>
              <th className="px-3 py-2">계정</th>
              <th className="px-3 py-2">선수(전체/활동)</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">승인일</th>
              <th className="px-3 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-matchon-border">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={(e) => toggle(row.id, e.target.checked)}
                    aria-label={`${row.gym.name} 선택`}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{row.gym.name}</td>
                <td className="px-3 py-2 tabular-nums">{row.memberCode}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-matchon-surface px-2 py-0.5 text-xs">
                    {MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL[row.accountStatus]}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {row.gym._count.fighters} / {row.gym.fighters.length}
                </td>
                <td className="px-3 py-2">
                  {MEMBER_GYM_STATUS_LABEL[row.status]}
                </td>
                <td className="px-3 py-2">
                  {row.approvedAt
                    ? format(new Date(row.approvedAt), "yyyy-MM-dd")
                    : "-"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/organizer/member-gyms/${row.id}`}
                    className="text-matchon-primary underline"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkSmsComposeDialog
        open={open}
        onOpenChange={setOpen}
        title="회원사 단체 문자"
        targetLabel={selectionLabel}
        stats={null}
        onPreview={async (message) => {
          const preview = await previewAssociationBulkSmsAction({
            scope,
            memberGymIds: selectedIds.size ? [...selectedIds] : undefined,
            status,
            q,
            message,
          });
          return {
            requestedCount: preview.requestedCount,
            eligibleCount: preview.eligibleCount,
            excludedCount: preview.excludedCount,
          };
        }}
        onSend={async (message, idempotencyKey) =>
          sendAssociationBulkSmsAction({
            scope,
            memberGymIds: selectedIds.size ? [...selectedIds] : undefined,
            status,
            q,
            message,
            idempotencyKey,
          })
        }
      />
    </>
  );
}
