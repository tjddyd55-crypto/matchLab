"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  saveAdminPlatformMessagingSettingsAction,
  testAdminPlatformMessagingConnectionAction,
} from "@/features/platform-messaging/admin-settings-actions";
import type { AdminPlatformMessagingSettingsVM } from "@/lib/services/platform-auth-sms.service";
import { adminContentCardClass, adminMutedTextClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className={adminMutedTextClass}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function AdminPlatformMessagingSettingsClient({
  initial,
}: {
  initial: AdminPlatformMessagingSettingsVM;
}) {
  const router = useRouter();
  const [loginId, setLoginId] = useState(initial.loginId);
  const [senderPhone, setSenderPhone] = useState(initial.senderPhone);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runtime = initial.runtime;

  return (
    <div className="space-y-4">
      <div className={cn(adminContentCardClass, "space-y-2 p-4")}>
        <h2 className="text-base font-semibold">런타임 상태</h2>
        <p className={`${adminMutedTextClass} text-sm`}>
          회원가입·비밀번호 재설정 OTP는 이 설정의 Aligo 계정을 사용합니다.
          협회/체육관 tenant 문자와 credential을 공유하지 않습니다.
        </p>
        <StatusRow
          label="Credential 출처"
          value={
            runtime.credentialsSource === "database"
              ? "DB (관리자 설정)"
              : runtime.credentialsSource === "environment"
                ? "환경 변수 (fallback)"
                : "미설정"
          }
        />
        <StatusRow
          label="회원가입 OTP"
          value={runtime.signupEnabled ? "활성" : "비활성"}
        />
        <StatusRow
          label="비밀번호 재설정 OTP"
          value={runtime.passwordResetEnabled ? "활성" : "비활성"}
        />
        <StatusRow label="Provider" value={runtime.provider} />
        <StatusRow label="DRY RUN" value={runtime.dryRun ? "ON" : "OFF"} />
        <StatusRow
          label="실발송 허용"
          value={runtime.realSendAllowed ? "가능" : "차단"}
        />
        <StatusRow
          label="Production 준비"
          value={runtime.productionReady ? "완료" : "미완료"}
        />
        {runtime.blockingReason ? (
          <p className="text-xs text-amber-700">
            차단 사유: {runtime.blockingReason}
          </p>
        ) : null}
      </div>

      <div className={cn(adminContentCardClass, "space-y-4 p-4")}>
        <div>
          <h2 className="text-lg font-semibold">플랫폼 문자 설정</h2>
          <p className={`${adminMutedTextClass} mt-1 text-sm`}>
            MATCHON 회사 공용 Aligo 계정입니다. 회원가입·비밀번호 재설정
            인증문자에만 사용됩니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="platform-aligo-id">
              Aligo ID
            </label>
            <input
              id="platform-aligo-id"
              className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="platform-aligo-sender">
              발신번호
            </label>
            <input
              id="platform-aligo-sender"
              className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="01012345678"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="platform-aligo-api-key">
            API Key
          </label>
          <input
            id="platform-aligo-api-key"
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
          <p className={`${adminMutedTextClass} text-xs`}>
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
                  await saveAdminPlatformMessagingSettingsAction({
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
                  const result = await testAdminPlatformMessagingConnectionAction({
                    loginId,
                    senderPhone,
                    apiKey: apiKey.trim() || undefined,
                  });
                  setMessage(result.message);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "연결 확인에 실패했습니다.",
                  );
                }
              });
            }}
          >
            연결 확인
          </Button>
        </div>
      </div>
    </div>
  );
}
