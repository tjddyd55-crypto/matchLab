"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveMemberGymApplicationAction,
  getMemberGymApplicationAttachmentDownloadAction,
  transitionMemberGymApplicationAction,
} from "@/features/member-gyms/actions";
import { AssociationMemberGymApplicationStatus } from "@/lib/enums";
import { MEMBER_GYM_ATTACHMENT_TYPE_LABEL } from "@/lib/ui-labels/member-gym";

type Candidate = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type Attachment = {
  id: string;
  attachmentType: keyof typeof MEMBER_GYM_ATTACHMENT_TYPE_LABEL;
  originalFileName: string;
};

export function MemberGymApplicationReviewPanel({
  applicationId,
  status,
  attachments,
  gymCandidates,
}: {
  applicationId: string;
  status: AssociationMemberGymApplicationStatus;
  attachments: Attachment[];
  gymCandidates: Candidate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mode, setMode] = useState<"link_existing" | "create_new">(
    gymCandidates.length > 0 ? "link_existing" : "create_new",
  );
  const [gymId, setGymId] = useState(gymCandidates[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [supplementNote, setSupplementNote] = useState("");

  const approved = status === AssociationMemberGymApplicationStatus.approved;

  return (
    <div className="space-y-4 rounded-md border border-matchon-border bg-white p-4">
      <h2 className="text-sm font-bold">검토·첨부</h2>
      <ul className="space-y-1 text-sm">
        {attachments.length === 0 ? (
          <li className="text-matchon-text-secondary">첨부 없음</li>
        ) : (
          attachments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <span>
                {MEMBER_GYM_ATTACHMENT_TYPE_LABEL[a.attachmentType]} ·{" "}
                {a.originalFileName}
              </span>
              <button
                type="button"
                className="text-xs text-matchon-primary underline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res =
                      await getMemberGymApplicationAttachmentDownloadAction(
                        a.id,
                      );
                    if (!res.ok) {
                      setMsg(res.error.message);
                      return;
                    }
                    window.open(res.data.signedUrl, "_blank", "noopener");
                  })
                }
              >
                {a.attachmentType === "applicant_signature" ||
                a.originalFileName.match(/\.(png|jpe?g|webp)$/i)
                  ? "미리보기/다운로드"
                  : "다운로드"}
              </button>
            </li>
          ))
        )}
      </ul>

      {!approved ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() =>
                start(async () => {
                  const res = await transitionMemberGymApplicationAction({
                    applicationId,
                    toStatus: AssociationMemberGymApplicationStatus.under_review,
                    note: note || undefined,
                  });
                  setMsg(res.ok ? "검토 중으로 변경했습니다." : res.error.message);
                  router.refresh();
                })
              }
            >
              검토 중
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() =>
                start(async () => {
                  const res = await transitionMemberGymApplicationAction({
                    applicationId,
                    toStatus: AssociationMemberGymApplicationStatus.on_hold,
                    note: note || undefined,
                  });
                  setMsg(res.ok ? "보류했습니다." : res.error.message);
                  router.refresh();
                })
              }
            >
              보류
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() =>
                start(async () => {
                  const res = await transitionMemberGymApplicationAction({
                    applicationId,
                    toStatus:
                      AssociationMemberGymApplicationStatus.supplementation_requested,
                    supplementationNote: supplementNote || "보완이 필요합니다.",
                  });
                  setMsg(res.ok ? "보완 요청했습니다." : res.error.message);
                  router.refresh();
                })
              }
            >
              보완 요청
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
              onClick={() =>
                start(async () => {
                  if (!rejectReason.trim()) {
                    setMsg("반려 사유를 입력해 주세요.");
                    return;
                  }
                  const res = await transitionMemberGymApplicationAction({
                    applicationId,
                    toStatus: AssociationMemberGymApplicationStatus.rejected,
                    rejectionReason: rejectReason,
                  });
                  setMsg(res.ok ? "반려했습니다." : res.error.message);
                  router.refresh();
                })
              }
            >
              반려
            </button>
            <button
              type="button"
              className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => setConfirmOpen(true)}
            >
              승인
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="검토 메모"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            rows={2}
          />
          <textarea
            value={supplementNote}
            onChange={(e) => setSupplementNote(e.target.value)}
            placeholder="보완 요청 내용"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            rows={2}
          />
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유 (반려 시 필수)"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            rows={2}
          />
        </>
      ) : (
        <p className="text-sm text-matchon-text-secondary">이미 승인된 신청입니다.</p>
      )}

      {msg ? <p className="text-sm text-matchon-text-secondary">{msg}</p> : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-md bg-white p-4 shadow-lg">
            <h3 className="text-sm font-bold">회원사 가입을 승인하시겠습니까?</h3>
            <p className="text-xs text-matchon-text-secondary">
              기존 Gym을 연결하거나 신규 Gym을 생성한 뒤 AssociationMemberGym을
              만듭니다. 자동으로 임의 연결하지 않습니다.
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "link_existing"}
                  onChange={() => setMode("link_existing")}
                />
                기존 Gym 연결
              </label>
              {mode === "link_existing" ? (
                <select
                  value={gymId}
                  onChange={(e) => setGymId(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                >
                  <option value="">선택</option>
                  {gymCandidates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.phone ?? "-"} · {g.address ?? "-"}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "create_new"}
                  onChange={() => setMode("create_new")}
                />
                신규 Gym 생성
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-xs"
                onClick={() => setConfirmOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() =>
                  start(async () => {
                    const res = await approveMemberGymApplicationAction({
                      applicationId,
                      mode,
                      gymId: mode === "link_existing" ? gymId : undefined,
                      note: note || undefined,
                    });
                    if (!res.ok) {
                      setMsg(res.error.message);
                      return;
                    }
                    setConfirmOpen(false);
                    setMsg(
                      `승인 완료 · 회원사 코드 ${res.data.memberCode}${
                        res.data.gymCreated ? " · Gym 신규 생성" : " · 기존 Gym 연결"
                      }`,
                    );
                    router.refresh();
                    router.push(`/organizer/member-gyms/${res.data.memberGymId}`);
                  })
                }
              >
                승인 확정
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
