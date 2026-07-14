"use client";

import { useState, useTransition } from "react";
import {
  issueMemberGymLinkAttachmentUploadAction,
  registerMemberGymLinkAttachmentAction,
  setMemberGymJoinLinkStatusAction,
} from "@/features/member-gyms/actions";
import {
  AssociationJoinLinkAttachmentKind,
  AssociationJoinLinkStatus,
} from "@/lib/enums";
import { ASSOCIATION_JOIN_LINK_STATUS_LABEL } from "@/lib/ui-labels/member-gym";
import { format } from "date-fns";

type LinkRow = {
  id: string;
  label: string;
  status: AssociationJoinLinkStatus;
  expiresAt: Date | string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: Date | string;
  _count: { applications: number; attachments: number };
};

export function MemberGymJoinLinkTable({ links }: { links: LinkRow[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (links.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-matchon-border px-3 py-6 text-sm text-matchon-text-secondary">
        생성된 가입 링크가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p className="text-sm text-matchon-text-secondary">{message}</p>
      ) : null}
      <div className="hidden overflow-x-auto rounded-md border border-matchon-border md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-matchon-surface text-xs text-matchon-text-secondary">
            <tr>
              <th className="px-3 py-2 font-medium">링크 이름</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">만료</th>
              <th className="px-3 py-2 font-medium">사용</th>
              <th className="px-3 py-2 font-medium">신청</th>
              <th className="px-3 py-2 font-medium">생성일</th>
              <th className="px-3 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-t border-matchon-border">
                <td className="px-3 py-2 font-medium">{link.label}</td>
                <td className="px-3 py-2">
                  {ASSOCIATION_JOIN_LINK_STATUS_LABEL[link.status]}
                </td>
                <td className="px-3 py-2">
                  {link.expiresAt
                    ? format(new Date(link.expiresAt), "yyyy-MM-dd HH:mm")
                    : "없음"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {link.usedCount}
                  {link.maxUses != null ? ` / ${link.maxUses}` : ""}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {link._count.applications}
                </td>
                <td className="px-3 py-2">
                  {format(new Date(link.createdAt), "yyyy-MM-dd")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        start(async () => {
                          await setMemberGymJoinLinkStatusAction({
                            linkId: link.id,
                            status:
                              link.status === AssociationJoinLinkStatus.active
                                ? AssociationJoinLinkStatus.inactive
                                : AssociationJoinLinkStatus.active,
                          });
                        })
                      }
                    >
                      {link.status === AssociationJoinLinkStatus.active
                        ? "비활성"
                        : "활성"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        start(async () => {
                          await setMemberGymJoinLinkStatusAction({
                            linkId: link.id,
                            status: AssociationJoinLinkStatus.revoked,
                          });
                        })
                      }
                    >
                      폐기
                    </button>
                    <label className="cursor-pointer rounded border px-2 py-1 text-xs">
                      안내 첨부
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          start(async () => {
                            const issue =
                              await issueMemberGymLinkAttachmentUploadAction({
                                linkId: link.id,
                                mimeType: file.type,
                                sizeBytes: file.size,
                                kind: AssociationJoinLinkAttachmentKind.join_guide,
                              });
                            if (!issue.ok) {
                              setMessage(issue.error.message);
                              return;
                            }
                            const put = await fetch(issue.data.uploadUrl, {
                              method: "PUT",
                              headers: {
                                "Content-Type": file.type,
                              },
                              body: file,
                            });
                            if (!put.ok) {
                              setMessage("파일 업로드에 실패했습니다.");
                              return;
                            }
                            const reg =
                              await registerMemberGymLinkAttachmentAction({
                                linkId: link.id,
                                storagePath: issue.data.path,
                                originalFileName: file.name,
                                mimeType: file.type,
                                sizeBytes: file.size,
                                kind: AssociationJoinLinkAttachmentKind.join_guide,
                              });
                            setMessage(
                              reg.ok
                                ? "안내자료를 첨부했습니다."
                                : reg.error.message,
                            );
                          });
                        }}
                      />
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {links.map((link) => (
          <li
            key={link.id}
            className="rounded-md border border-matchon-border bg-white p-3 text-sm"
          >
            <p className="font-semibold">{link.label}</p>
            <p className="mt-1 text-xs text-matchon-text-secondary">
              {ASSOCIATION_JOIN_LINK_STATUS_LABEL[link.status]} · 신청{" "}
              {link._count.applications} · 사용 {link.usedCount}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
