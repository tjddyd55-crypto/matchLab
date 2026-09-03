"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import {
  deleteBillingProviderSecretAction,
  saveBillingProviderCredentialsAction,
  updateBillingRuntimeAction,
  validateBillingSettingsAction,
} from "@/features/billing/admin-settings-actions";
import type { AdminBillingSettingsVM } from "@/lib/services/admin-billing-settings.service";
import { adminContentCardClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

function StatusRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span
        className={cn(
          "font-medium",
          highlight ? "text-amber-700" : "text-matchon-text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CredentialForm({
  environment,
  slot,
  encryptionKeyConfigured,
}: {
  environment: "TEST" | "LIVE";
  slot: AdminBillingSettingsVM["test"];
  encryptionKeyConfigured: boolean;
}) {
  const { confirm } = useAppConfirmDialog();
  const router = useRouter();
  const [clientKey, setClientKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isLive = environment === "LIVE";

  return (
    <div className={cn(adminContentCardClass, "space-y-4 p-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{environment} 환경</h3>
        {environment === "TEST" ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            TEST MODE
          </span>
        ) : (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
            LIVE
          </span>
        )}
      </div>

      <div className="grid gap-2 text-sm">
        <StatusRow label="Client Key" value={slot.clientLabel} />
        <StatusRow label="Secret Key" value={slot.secretLabel} />
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Client Key</span>
          <input
            type="text"
            name="clientKey"
            value={clientKey}
            onChange={(e) => setClientKey(e.target.value)}
            placeholder={
              slot.clientKeyConfigured
                ? "변경 시에만 입력"
                : isLive
                  ? "live_ck_..."
                  : "test_ck_..."
            }
            className="mt-1 w-full min-w-0 rounded-lg border border-matchon-border px-3 py-2 font-mono text-sm outline-none focus:border-matchon-primary"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Secret Key</span>
          <input
            type="password"
            name="secretKey"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={
              slot.secretKeyConfigured
                ? "변경 시에만 입력 (비우면 유지)"
                : isLive
                  ? "live_sk_..."
                  : "test_sk_..."
            }
            disabled={!encryptionKeyConfigured}
            className="mt-1 w-full min-w-0 rounded-lg border border-matchon-border px-3 py-2 font-mono text-sm outline-none focus:border-matchon-primary disabled:opacity-50"
            autoComplete="new-password"
          />
          {!encryptionKeyConfigured ? (
            <p className="mt-1 text-xs text-red-600">
              서버 암호화 키(MATCHON_PII_ENCRYPTION_KEY)가 설정되지 않아 Secret을
              저장할 수 없습니다.
            </p>
          ) : null}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || (!clientKey.trim() && !secretKey.trim())}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const res = await saveBillingProviderCredentialsAction({
                environment,
                clientKey: clientKey.trim() || undefined,
                secretKey: secretKey.trim() || undefined,
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setClientKey("");
              setSecretKey("");
              setMessage("저장되었습니다.");
              router.refresh();
            });
          }}
        >
          저장
        </Button>
        {slot.secretKeyConfigured ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const ok = await confirm({
                  title: "Secret Key 삭제",
                  description: `${environment} Secret Key를 삭제합니다. 계속하시겠습니까?`,
                  confirmLabel: "삭제",
                  variant: "danger",
                });
                if (!ok) return;
                const res = await deleteBillingProviderSecretAction({
                  environment,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage("Secret Key가 삭제되었습니다.");
                router.refresh();
              });
            }}
          >
            Secret 삭제
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function AdminBillingSettingsClient({
  initial,
}: {
  initial: AdminBillingSettingsVM;
}) {
  const { confirm } = useAppConfirmDialog();
  const router = useRouter();
  const [provider, setProvider] = useState<"NONE" | "TOSS">(
    initial.runtime.provider === "TOSS" ? "TOSS" : "NONE",
  );
  const [environment, setEnvironment] = useState<"TEST" | "LIVE">(
    initial.runtime.environment === "LIVE" ? "LIVE" : "TEST",
  );
  const [enabled, setEnabled] = useState(initial.runtime.enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validateMsg, setValidateMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const d = initial.diagnostics;

  return (
    <div className="flex flex-col gap-6">
      <div className={cn(adminContentCardClass, "p-4")}>
        <h2 className="mb-3 text-sm font-semibold">결제 연동 상태</h2>
        <StatusRow label="상태" value={initial.connectionLabel} />
        <StatusRow label="준비도" value={initial.readinessLabel} />
        <StatusRow label="Provider" value={d.runtimeProvider} />
        <StatusRow
          label="현재 결제 환경"
          value={d.runtimeEnvironment ?? "—"}
          highlight={d.runtimeEnvironment === "TEST"}
        />
        <StatusRow
          label="Billing"
          value={d.runtimeEnabled ? "활성" : "비활성"}
        />
        <StatusRow label="Credential 출처" value={d.credentialSource} />
      </div>

      <div className={cn(adminContentCardClass, "space-y-4 p-4")}>
        <h2 className="text-sm font-semibold">활성 환경 · 연동</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Provider
            <select
              value={provider}
              onChange={(e) =>
                setProvider(e.target.value === "TOSS" ? "TOSS" : "NONE")
              }
              className="mt-1 w-full rounded-lg border border-matchon-border px-3 py-2 text-sm"
            >
              <option value="NONE">미설정</option>
              <option value="TOSS">Toss Payments</option>
            </select>
          </label>
          <label className="text-sm">
            Environment
            <select
              value={environment}
              onChange={(e) =>
                setEnvironment(e.target.value === "LIVE" ? "LIVE" : "TEST")
              }
              disabled={provider === "NONE"}
              className="mt-1 w-full rounded-lg border border-matchon-border px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="TEST">TEST</option>
              <option value="LIVE">LIVE</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={provider === "NONE"}
          />
          Toss 결제 연동 활성화
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                if (enabled && environment === "LIVE") {
                  const ok = await confirm({
                    title: "라이브 결제 활성화",
                    description:
                      "라이브 결제를 활성화하면 실제 금액이 청구될 수 있습니다.",
                    confirmLabel: "라이브 활성화",
                    variant: "danger",
                  });
                  if (!ok) return;
                }
                const res = await updateBillingRuntimeAction({
                  provider,
                  environment: provider === "TOSS" ? environment : null,
                  enabled: provider !== "NONE" && enabled,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage("연동 설정이 저장되었습니다.");
                router.refresh();
              });
            }}
          >
            연동 설정 저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !initial.canValidate}
            onClick={() => {
              setValidateMsg(null);
              setError(null);
              startTransition(async () => {
                const res = await validateBillingSettingsAction();
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setValidateMsg(res.data.message);
              });
            }}
          >
            연결 확인
          </Button>
        </div>
        {message ? (
          <p className="text-sm text-emerald-700">{message}</p>
        ) : null}
        {validateMsg ? (
          <p className="text-sm text-emerald-700">{validateMsg}</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <CredentialForm
        environment="TEST"
        slot={initial.test}
        encryptionKeyConfigured={initial.encryptionKeyConfigured}
      />
      <CredentialForm
        environment="LIVE"
        slot={initial.live}
        encryptionKeyConfigured={initial.encryptionKeyConfigured}
      />

      <div className={cn(adminContentCardClass, "p-4")}>
        <h2 className="mb-3 text-sm font-semibold">현재 진단</h2>
        <StatusRow label="Billing DB" value="정상" />
        <StatusRow
          label="Plan"
          value={`${d.activePlanCount}개 활성`}
        />
        <StatusRow label="Provider" value={d.runtimeProvider} />
        <StatusRow
          label="TEST Client"
          value={initial.test.clientKeyConfigured ? "등록됨" : "미등록"}
        />
        <StatusRow
          label="TEST Secret"
          value={initial.test.secretKeyConfigured ? "등록됨" : "미등록"}
        />
        <StatusRow
          label="LIVE Client"
          value={initial.live.clientKeyConfigured ? "등록됨" : "미등록"}
        />
        <StatusRow
          label="LIVE Secret"
          value={initial.live.secretKeyConfigured ? "등록됨" : "미등록"}
        />
        <StatusRow
          label="Renewal Worker"
          value={
            d.renewalSchedulerReady
              ? "Scheduler endpoint 준비됨"
              : "미설정 (CRON_SECRET 없음)"
          }
        />
        <StatusRow
          label="Access Gate"
          value={
            d.accessGateEnforce
              ? "MATCHON_BILLING_ENFORCE_ACCESS=on"
              : "per-user billingRequiredAt"
          }
        />
        <StatusRow
          label="암호화 키"
          value={d.encryptionKeyConfigured ? "설정됨" : "미설정"}
        />
      </div>
    </div>
  );
}
