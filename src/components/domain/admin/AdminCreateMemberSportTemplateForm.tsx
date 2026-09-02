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
  const [displayName, setDisplayName] = useState("태권도");
  const [sportType, setSportType] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedDisplayName = displayName.trim();
    const trimmedSportType = sportType.trim();
    startTransition(async () => {
      const result = await createMemberSportTemplateAction({
        code,
        name,
        displayName,
        sportType: trimmedSportType || trimmedDisplayName || code,
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
        <p className="text-xs text-matchon-text-secondary">
          관리자가 템플릿을 구분하기 위한 내부 이름입니다.
        </p>
      </label>

      <label className="block space-y-1 text-sm">
        <span>표시명 *</span>
        <input
          className={matchonFieldInputClass}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <p className="text-xs text-matchon-text-secondary">
          체육관 가입·회원관리 화면에 표시되는 종목명입니다.
        </p>
      </label>

      <label className="block space-y-1 text-sm">
        <span>종목 분류</span>
        <input
          className={matchonFieldInputClass}
          value={sportType}
          onChange={(e) => setSportType(e.target.value)}
          placeholder={displayName.trim() || code}
        />
        <p className="text-xs text-matchon-text-secondary">
          비워두면 표시명 또는 종목 코드가 사용됩니다.
        </p>
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
