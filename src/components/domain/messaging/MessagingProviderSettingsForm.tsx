"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessagingProviderOwnerType } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  saveMessagingProviderSettingsAction,
  testMessagingProviderConnectionAction,
} from "@/features/messaging/provider-settings-actions";
import type { MessagingProviderSettingsVM } from "@/lib/services/messaging-provider-settings.service";
import { adminContentCardClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

export function MessagingProviderSettingsForm({
  initial,
}: {
  initial: MessagingProviderSettingsVM;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [loginId, setLoginId] = useState(initial.loginId);
  const [senderPhone, setSenderPhone] = useState(initial.senderPhone);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ownerLabel =
    initial.ownerType === MessagingProviderOwnerType.association
      ? "협회"
      : "체육관";

  return (
    <div className={cn(adminContentCardClass, "space-y-4 p-4")}>
      <div>
        <h2 className="text-lg font-semibold">문자 발송 설정</h2>
        <p className="mt-1 text-sm text-matchon-text-secondary">
          {ownerLabel} 전용 알리고 계정을 연결합니다. 플랫폼 공용 계정은 사용하지
          않습니다.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        알리고 사용
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="aligo-login-id">
            알리고 아이디
          </label>
          <input
            id="aligo-login-id"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="aligo-sender">
            발신번호
          </label>
          <input
            id="aligo-sender"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="01012345678"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="aligo-api-key">
          API Key
        </label>
        <input
          id="aligo-api-key"
          type="password"
          className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            initial.apiKeyConfigured
              ? `현재: ${initial.apiKeyMasked}`
              : "API Key 입력"
          }
          autoComplete="new-password"
        />
        <p className="text-xs text-matchon-text-secondary">
          저장 후 API Key는 마스킹됩니다. 빈 값으로 저장하면 기존 Key를
          유지합니다.
        </p>
      </div>

      {!initial.encryptionKeyConfigured ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          MATCHON_PII_ENCRYPTION_KEY가 설정되지 않아 API Key를 저장할 수
          없습니다.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">{message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              try {
                await saveMessagingProviderSettingsAction({
                  ownerType: initial.ownerType,
                  enabled,
                  loginId,
                  senderPhone,
                  apiKey: apiKey.trim() || undefined,
                });
                setApiKey("");
                setMessage("설정이 저장되었습니다.");
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "저장에 실패했습니다.",
                );
              }
            });
          }}
        >
          저장
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              try {
                const result = await testMessagingProviderConnectionAction({
                  ownerType: initial.ownerType,
                  loginId,
                  senderPhone,
                  apiKey: apiKey.trim() || undefined,
                });
                setMessage(result.message);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "연결 확인에 실패했습니다.",
                );
              }
            });
          }}
        >
          연결 확인
        </Button>
      </div>
    </div>
  );
}
