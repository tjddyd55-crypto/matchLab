"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  GymStaffFormFields,
  type GymStaffFormInitial,
} from "@/components/domain/gym-staff/GymStaffFormFields";
import { Button } from "@/components/ui/button";
import {
  deactivateGymStaffAction,
  updateGymStaffAction,
} from "@/features/gym-staff/actions";

export function GymStaffEditForm({
  staffId,
  initial,
  isActive,
}: {
  staffId: string;
  initial: GymStaffFormInitial;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    formData.set("isActive", isActive ? "true" : "false");
    startTransition(async () => {
      const result = await updateGymStaffAction(staffId, formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function deactivate() {
    if (
      !window.confirm(
        "재직 종료로 처리할까요?\n\n담당 회원 배정도 함께 해제됩니다. 출석·매출 이력은 유지됩니다.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deactivateGymStaffAction(staffId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push("/gym/staff");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-xs text-matchon-primary" role="status">
          저장했습니다.
        </p>
      ) : null}

      <GymStaffFormFields initial={initial} />

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        {isActive ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={deactivate}
          >
            재직 종료
          </Button>
        ) : null}
      </div>
    </form>
  );
}
