"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AdminMemberSportTemplateListItem } from "@/lib/services/member-sport-template-admin.service";
import {
  deleteMemberSportTemplateAction,
  duplicateMemberSportTemplateAction,
} from "@/features/admin/member-sport-template-actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatUtcDateOnly } from "@/lib/date-only";

export function AdminMemberSportTemplateListTable({
  templates,
}: {
  templates: AdminMemberSportTemplateListItem[];
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();

  function duplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateMemberSportTemplateAction(id);
      if (!result.ok) {
        await alert({
          title: "복제 실패",
          description: result.error.message,
        });
        return;
      }
      router.push(`/admin/member-sport-templates/${result.data.id}`);
      router.refresh();
    });
  }

  async function remove(id: string, gymCount: number) {
    if (gymCount > 0) {
      await alert({
        title: "삭제할 수 없음",
        description: "체육관에서 사용 중인 템플릿은 삭제할 수 없습니다.",
      });
      return;
    }
    const ok = await confirm({
      title: "템플릿 삭제",
      description: "이 템플릿을 삭제하시겠습니까?",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteMemberSportTemplateAction(id);
      if (!result.ok) {
        await alert({
          title: "삭제 실패",
          description: result.error.message,
        });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-matchon-border text-xs text-matchon-text-secondary">
          <tr>
            <th className="px-3 py-2 font-medium">표시명</th>
            <th className="px-3 py-2 font-medium">템플릿명</th>
            <th className="px-3 py-2 font-medium">종목 코드</th>
            <th className="px-3 py-2 font-medium">필드 수</th>
            <th className="px-3 py-2 font-medium">사용 체육관</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">수정일</th>
            <th className="px-3 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr
              key={t.id}
              className="border-b border-matchon-border/70 last:border-0"
            >
              <td className="px-3 py-2.5 font-medium">{t.displayName}</td>
              <td className="px-3 py-2.5">{t.name}</td>
              <td className="px-3 py-2.5 text-matchon-text-secondary">
                {t.code}
              </td>
              <td className="px-3 py-2.5">{t.fieldCount}</td>
              <td className="px-3 py-2.5">{t.gymCount}</td>
              <td className="px-3 py-2.5">
                {t.active ? "활성" : "비활성"}
              </td>
              <td className="px-3 py-2.5">
                {formatUtcDateOnly(t.updatedAt)}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/admin/member-sport-templates/${t.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    관리
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                    )}
                    onClick={() => duplicate(t.id)}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    disabled={pending || t.gymCount > 0}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-destructive",
                    )}
                    onClick={() => void remove(t.id, t.gymCount)}
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
