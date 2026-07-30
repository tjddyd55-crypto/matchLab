"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  GymStaffFormFields,
} from "@/components/domain/gym-staff/GymStaffFormFields";
import { Button, buttonVariants } from "@/components/ui/button";
import { createGymStaffAction } from "@/features/gym-staff/actions";
import { cn } from "@/lib/utils";

export function GymStaffCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createGymStaffAction(formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/gym/staff/${result.data.staffId}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="mx-auto max-w-2xl space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <GymStaffFormFields />

      <p className="rounded-lg border border-matchon-border bg-matchon-surface/50 px-3 py-2 text-xs text-matchon-text-secondary">
        로그인 계정은 등록 후 상세 화면에서 설정 링크를 발급해 만듭니다. 관장이
        비밀번호를 직접 만들거나 확인할 수는 없습니다.
      </p>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "선생님 등록"}
        </Button>
        <Link
          href="/gym/staff"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          취소
        </Link>
      </div>
    </form>
  );
}
