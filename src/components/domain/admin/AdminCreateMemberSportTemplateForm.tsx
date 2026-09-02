"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMemberSportTemplateAction } from "@/features/admin/member-sport-template-actions";
import { SUGGESTED_MEMBER_SPORT_TEMPLATE_CODES } from "@/lib/gym-member-profile/sport-template-code";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export function AdminCreateMemberSportTemplateForm() {
  const router = useRouter();
  const [code, setCode] = useState("TAEKWONDO");
  const [name, setName] = useState("태권도 기본 회원정보");
  const [sportType, setSportType] = useState("태권도");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createMemberSportTemplateAction({
        code,
        name,
        sportType,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/admin/member-sport-templates/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1 text-sm">
        <span>종목 코드 *</span>
        <input
          className={matchonFieldInputClass}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          pattern="[A-Z][A-Z0-9_]{1,31}"
          placeholder="TAEKWONDO"
        />
        <p className="text-xs text-matchon-text-secondary">
          예: {SUGGESTED_MEMBER_SPORT_TEMPLATE_CODES.join(", ")}
        </p>
      </label>

      <label className="block space-y-1 text-sm">
        <span>템플릿명 *</span>
        <input
          className={matchonFieldInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>표시명 *</span>
        <input
          className={matchonFieldInputClass}
          value={sportType}
          onChange={(e) => setSportType(e.target.value)}
          required
        />
      </label>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "생성 중…" : "템플릿 생성"}
        </Button>
      </div>
    </form>
  );
}
