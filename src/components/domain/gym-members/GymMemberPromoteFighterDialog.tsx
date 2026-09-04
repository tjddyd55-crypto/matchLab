"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { promoteGymMemberToFighterAction } from "@/features/gym-members/actions";
import { formatUtcDateOnly } from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export type PromoteSportOption = {
  id: string;
  label: string;
};

export function GymMemberPromoteFighterDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  gymName,
  birthDate,
  genderLabel,
  defaultPrimarySport,
  sportOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  gymName: string;
  birthDate: Date | string | null;
  genderLabel: string | null;
  defaultPrimarySport: string;
  sportOptions: PromoteSportOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set("createLoginAccount", "false");
    startTransition(async () => {
      const result = await promoteGymMemberToFighterAction(memberId, formData);
      if (!result.ok) {
        setError(result.error?.message ?? "선수 등록에 실패했습니다.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  const canRegister = Boolean(birthDate && genderLabel);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>선수로 등록</DialogTitle>
          <DialogDescription>
            회원 정보를 바탕으로 MATCHON 선수를 연결합니다. 공식 전적은 경기
            결과에서만 집계됩니다.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-1.5 text-xs text-matchon-text-secondary">
          <div className="flex justify-between gap-3">
            <dt>회원</dt>
            <dd className="font-medium text-matchon-text-primary">
              {memberName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>소속</dt>
            <dd className="text-matchon-text-primary">{gymName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>생년월일</dt>
            <dd className="text-matchon-text-primary">
              {birthDate ? formatUtcDateOnly(birthDate) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>성별</dt>
            <dd className="text-matchon-text-primary">
              {genderLabel ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="border-t border-matchon-border" />

        {!canRegister ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            선수로 등록하려면 생년월일과 성별이 필요합니다. 회원 정보를 먼저
            수정해 주세요.
          </p>
        ) : (
          <form action={submit} className="space-y-3">
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <label className="block space-y-1 text-sm">
              <span className="text-matchon-text-secondary">선수명</span>
              <input
                value={memberName}
                readOnly
                className={matchonFieldInputClass}
                aria-readonly
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-matchon-text-secondary">주 종목</span>
              {sportOptions.length > 0 ? (
                <select
                  name="primarySport"
                  defaultValue={defaultPrimarySport}
                  className={matchonFieldInputClass}
                >
                  {sportOptions.map((opt) => (
                    <option key={opt.id} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="primarySport"
                  defaultValue={defaultPrimarySport}
                  className={matchonFieldInputClass}
                  placeholder="예: 킥복싱"
                />
              )}
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1 text-sm">
                <span className="text-matchon-text-secondary">신장 (cm)</span>
                <input
                  name="height"
                  inputMode="decimal"
                  className={matchonFieldInputClass}
                  placeholder="선택"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-matchon-text-secondary">
                  현재 체중 (kg)
                </span>
                <input
                  name="weight"
                  inputMode="decimal"
                  className={matchonFieldInputClass}
                  placeholder="선택"
                />
              </label>
            </div>

            <DialogFooter className="px-0 pb-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "등록 중…" : "선수 등록"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
