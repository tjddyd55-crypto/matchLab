"use client";

import { useState, useTransition } from "react";
import { saveMemberGymSettingsAction } from "@/features/member-gyms/actions";
import type { MemberGymSettingsV1 } from "@/lib/member-gym/settings";

export function MemberGymSettingsForm({
  initial,
}: {
  initial: MemberGymSettingsV1;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveMemberGymSettingsAction(value);
          setMsg(res.ok ? "저장했습니다." : res.error.message);
        });
      }}
    >
      <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">1. 가입 링크 설정</h2>
        <label className="block text-xs">
          기본 유효기간(일)
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={value.joinLink.defaultExpiresDays ?? ""}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                joinLink: {
                  ...v.joinLink,
                  defaultExpiresDays: e.target.value
                    ? Number(e.target.value)
                    : null,
                },
              }))
            }
          />
        </label>
        <label className="block text-xs">
          안내 문구
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={2}
            value={value.joinLink.guideMessage}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                joinLink: { ...v.joinLink, guideMessage: e.target.value },
              }))
            }
          />
        </label>
        <label className="block text-xs">
          접수 완료 문구
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={2}
            value={value.joinLink.completionMessage}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                joinLink: { ...v.joinLink, completionMessage: e.target.value },
              }))
            }
          />
        </label>
      </section>

      <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">2~3. 신청서·첨부 설정</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.form.requireRepresentativePhoto}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                form: {
                  ...v.form,
                  requireRepresentativePhoto: e.target.checked,
                },
              }))
            }
          />
          증명사진 필수
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.form.requireBusinessRegistration}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                form: {
                  ...v.form,
                  requireBusinessRegistration: e.target.checked,
                },
              }))
            }
          />
          사업자등록증 필수
        </label>
      </section>

      <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">4~6. 승인·회원사 코드</h2>
        <p className="text-xs text-matchon-text-secondary">
          승인은 관리자 확인 모달 후 처리합니다. 자동 승인·결제는 후속 단계입니다.
        </p>
        <label className="block text-xs">
          회원사 코드 접두어
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={value.approval.memberCodePrefix}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                approval: {
                  ...v.approval,
                  memberCodePrefix: e.target.value,
                },
              }))
            }
          />
        </label>
        <label className="block text-xs">
          자리수
          <input
            type="number"
            min={3}
            max={8}
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={value.approval.memberCodePadding}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                approval: {
                  ...v.approval,
                  memberCodePadding: Number(e.target.value) || 5,
                },
              }))
            }
          />
        </label>
      </section>

      <section className="space-y-2 rounded-md border border-dashed border-matchon-border bg-matchon-surface p-4 text-sm text-matchon-text-secondary">
        <h2 className="text-sm font-bold text-matchon-text-primary">
          7~10. 회비·선수·공개·알림 (UI만)
        </h2>
        <p>
          회비 결제, 문자·알림톡, 선수 이적·다단계 승인은 후속 단계에서
          구현합니다. 이번 저장 모델은 `AssociationMemberGymSettings.settingsJson`
          한 행으로 관리합니다.
        </p>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-matchon-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "저장 중…" : "설정 저장"}
      </button>
      {msg ? <p className="text-sm">{msg}</p> : null}
    </form>
  );
}
