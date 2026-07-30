"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyGymMemberPortalIdentityAction } from "@/features/gym-member-portal/member-actions";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/phone";

export function MemberPortalVerifyForm({
  token,
  gymName,
}: {
  token: string;
  gymName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("name", name);
    fd.set("phone", phone);
    startTransition(async () => {
      const result = await verifyGymMemberPortalIdentityAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.replace(`/member-portal/${token}/home`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#0A47FF]">MATCHON</p>
        <h1 className="mt-2 text-xl font-bold text-[#001C7A] break-keep">
          {gymName} 회원 전용 페이지
        </h1>
        <p className="mt-2 text-sm text-[#64748B]">
          등록된 회원 정보를 입력해 주세요.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[#0F172A]">이름</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="min-h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-base text-[#0F172A] outline-none focus:border-[#0A47FF]"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[#0F172A]">휴대폰 번호</span>
        <input
          name="phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          autoComplete="tel"
          className="min-h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-base text-[#0F172A] outline-none focus:border-[#0A47FF]"
          placeholder="010-0000-0000"
          required
        />
      </label>

      {error ? (
        <p className="whitespace-pre-line text-sm text-red-600">{error}</p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        회원 확인
      </Button>
    </form>
  );
}
