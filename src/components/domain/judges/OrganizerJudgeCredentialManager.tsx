"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createJudgeCredentialAction,
  resetJudgePasswordAction,
  setJudgeCredentialActiveAction,
} from "@/features/judges/actions";
import { Button } from "@/components/ui/button";
import type { JudgeCredentialListItemVM } from "@/lib/services/judge-credential.service";

type CreateCredentialFormState = {
  loginId: string;
  password: string;
  displayName: string;
  memo: string;
};

const EMPTY_CREATE_FORM: CreateCredentialFormState = {
  loginId: "",
  password: "",
  displayName: "",
  memo: "",
};

export function OrganizerJudgeCredentialManager({
  eventId,
  credentials,
  loginUrl,
}: {
  eventId: string;
  credentials: JudgeCredentialListItemVM[];
  loginUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createForm, setCreateForm] =
    useState<CreateCredentialFormState>(EMPTY_CREATE_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const inputClass =
    "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  function patchCreateForm<K extends keyof CreateCredentialFormState>(
    key: K,
    value: CreateCredentialFormState[K],
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">심판 계정</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(loginUrl);
            setMessage("심판 로그인 URL이 복사되었습니다.");
          }}
        >
          접속 URL 복사
        </Button>
      </div>
      <p className="text-muted-foreground break-all text-xs">{loginUrl}</p>

      <form
        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          setCreatedPassword(null);

          const fd = new FormData();
          fd.set("eventId", eventId);
          fd.set("loginId", createForm.loginId.trim());
          fd.set("password", createForm.password);
          fd.set("displayName", createForm.displayName);
          fd.set("memo", createForm.memo);

          run(async () => {
            const res = await createJudgeCredentialAction(fd);
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            setCreateForm(EMPTY_CREATE_FORM);
            setCreatedPassword(res.data.plainPassword);
            setMessage(
              `계정 ${res.data.loginId} 생성됨 — 임시 비밀번호: ${res.data.plainPassword}`,
            );
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">로그인 ID</span>
          <input
            name="loginId"
            required
            value={createForm.loginId}
            onChange={(e) => patchCreateForm("loginId", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">
            비밀번호 (비우면 자동 생성)
          </span>
          <input
            name="password"
            type="text"
            value={createForm.password}
            onChange={(e) => patchCreateForm("password", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">표시 이름</span>
          <input
            name="displayName"
            value={createForm.displayName}
            onChange={(e) => patchCreateForm("displayName", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">메모</span>
          <input
            name="memo"
            value={createForm.memo}
            onChange={(e) => patchCreateForm("memo", e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending} size="sm">
            계정 생성
          </Button>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
      ) : null}
      {createdPassword ? (
        <p className="text-muted-foreground text-xs">
          생성된 비밀번호를 심판에게 전달하세요. 재확인은 비밀번호 재설정으로
          가능합니다.
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="min-w-0 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-0 text-left text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">최근 접속</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c) => (
              <tr key={c.id} className="border-t text-xs">
                <td className="px-3 py-2 font-mono">{c.loginId}</td>
                <td className="px-3 py-2">{c.displayName ?? "—"}</td>
                <td className="px-3 py-2">
                  {c.isActive ? "활성" : "비활성"}
                </td>
                <td className="px-3 py-2">
                  {c.lastLoginAt
                    ? new Date(c.lastLoginAt).toLocaleString("ko-KR")
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("credentialId", c.id);
                        run(async () => {
                          const res = await resetJudgePasswordAction(fd);
                          if (!res.ok) {
                            setError(res.error.message);
                            return;
                          }
                          setMessage(
                            `${c.loginId} 새 비밀번호: ${res.data.plainPassword}`,
                          );
                        });
                      }}
                    >
                      비밀번호 재설정
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("credentialId", c.id);
                        fd.set("isActive", c.isActive ? "false" : "true");
                        run(async () => {
                          const res = await setJudgeCredentialActiveAction(fd);
                          if (!res.ok) setError(res.error.message);
                        });
                      }}
                    >
                      {c.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {credentials.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            등록된 심판 계정이 없습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
