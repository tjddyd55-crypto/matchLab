"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  assignGymStaffMemberAction,
  searchGymStaffAssignableMembersAction,
  unassignGymStaffMemberAction,
} from "@/features/gym-staff/actions";
import { GYM_STAFF_ASSIGNMENT_TYPE_OPTIONS } from "@/lib/gym-staff/labels";
import { formatPhoneNumber } from "@/lib/phone";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export type GymStaffAssignmentItem = {
  id: string;
  gymMemberId: string;
  memberName: string;
  memberNumber: string;
  assignmentTypeLabel: string;
  isPrimary: boolean;
};

type MemberCandidate = {
  id: string;
  name: string;
  memberNumber: string;
  phone: string;
};

/**
 * 담당 회원 배정 UI.
 * 대표 담당은 회원당 1명이며, 체크 시 서버에서 다른 대표 담당을 자동 해제한다.
 */
export function GymStaffAssignmentPanel({
  staffId,
  assignments,
}: {
  staffId: string;
  assignments: GymStaffAssignmentItem[];
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<MemberCandidate[] | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignmentType, setAssignmentType] = useState<string>(
    GYM_STAFF_ASSIGNMENT_TYPE_OPTIONS[0]?.value ?? "GENERAL",
  );
  const [isPrimary, setIsPrimary] = useState(false);
  const [memo, setMemo] = useState("");

  function search() {
    setError(null);
    startTransition(async () => {
      const result = await searchGymStaffAssignableMembersAction(query);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCandidates(result.data);
    });
  }

  function assign() {
    if (!selectedMemberId) {
      setError("담당할 회원을 선택해 주세요.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("gymMemberId", selectedMemberId);
    formData.set("assignmentType", assignmentType);
    formData.set("isPrimary", isPrimary ? "true" : "false");
    formData.set("memo", memo);

    startTransition(async () => {
      const result = await assignGymStaffMemberAction(staffId, formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSelectedMemberId("");
      setIsPrimary(false);
      setMemo("");
      setCandidates(null);
      setQuery("");
      router.refresh();
    });
  }

  async function unassign(assignment: GymStaffAssignmentItem) {
    const ok = await confirm({
      title: `${assignment.memberName} 회원의 담당을 해제할까요?`,
      description: "배정 이력은 보관됩니다.",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await unassignGymStaffMemberAction(staffId, assignment.id);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {assignments.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          담당 회원이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-matchon-border">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <div className="min-w-0">
                <Link
                  href={`/gym/members/${assignment.gymMemberId}`}
                  className="font-medium text-matchon-text-primary underline underline-offset-2"
                >
                  {assignment.memberName}
                </Link>
                <p className="mt-0.5 text-xs text-matchon-text-secondary">
                  {assignment.memberNumber} · {assignment.assignmentTypeLabel}
                  {assignment.isPrimary ? " · 대표 담당" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => void unassign(assignment)}
              >
                담당 해제
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-matchon-border bg-matchon-surface/40 p-3">
        <p className="text-sm font-medium">담당 회원 추가</p>

        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            placeholder="이름, 연락처, 회원번호"
            onChange={(e) => setQuery(e.target.value)}
            className={`${matchonFieldInputClass} max-w-xs flex-1`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={search}
          >
            회원 검색
          </Button>
        </div>

        {candidates ? (
          candidates.length === 0 ? (
            <p className="text-xs text-matchon-text-secondary">
              검색 결과가 없습니다.
            </p>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>회원 선택</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className={matchonFieldInputClass}
              >
                <option value="">선택</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.memberNumber} ·{" "}
                    {formatPhoneNumber(candidate.phone)}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : null}

        <label className="block space-y-1 text-sm">
          <span>담당 유형</span>
          <select
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value)}
            className={matchonFieldInputClass}
          >
            {GYM_STAFF_ASSIGNMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          대표 담당으로 지정 (회원당 1명)
        </label>

        <label className="block space-y-1 text-sm">
          <span>메모</span>
          <input
            value={memo}
            maxLength={500}
            onChange={(e) => setMemo(e.target.value)}
            className={matchonFieldInputClass}
          />
        </label>

        <Button type="button" size="sm" disabled={pending} onClick={assign}>
          {pending ? "처리 중…" : "담당 배정"}
        </Button>
      </div>
    </div>
  );
}
