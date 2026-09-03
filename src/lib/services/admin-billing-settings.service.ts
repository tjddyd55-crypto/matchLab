import "server-only";

import {
  AuditAction,
  BillingProviderEnvironment,
  BillingProviderKind,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  encryptBillingSecret,
  isBillingCredentialEncryptionConfigured,
} from "@/lib/billing/billing-credential-crypto";
import {
  invalidateBillingProviderConfigCache,
  resolveBillingProviderConfig,
} from "@/lib/billing/billing-provider-config";
import {
  formatBillingReadinessLabel,
  formatConnectionStatusLabel,
  getBillingSettingsDiagnostics,
  providerSlotStatus,
  type BillingSettingsDiagnostics,
} from "@/lib/billing/billing-provider-diagnostics";
import {
  maskClientKey,
  validateClientKeyForEnvironment,
  validateKeyPairConsistency,
  validateSecretKeyForEnvironment,
  type BillingKeyEnvironment,
} from "@/lib/billing/billing-key-validation";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { billingProviderConfigRepository } from "@/lib/repositories/billing-provider-config.repository";
import { prisma } from "@/lib/prisma";

export type AdminBillingSettingsVM = {
  diagnostics: BillingSettingsDiagnostics;
  connectionLabel: string;
  readinessLabel: string;
  runtime: {
    provider: BillingProviderKind;
    environment: BillingProviderEnvironment | null;
    enabled: boolean;
  };
  test: {
    clientKeyMasked: string | null;
    clientKeyConfigured: boolean;
    secretKeyConfigured: boolean;
    clientLabel: string;
    secretLabel: string;
  };
  live: {
    clientKeyMasked: string | null;
    clientKeyConfigured: boolean;
    secretKeyConfigured: boolean;
    clientLabel: string;
    secretLabel: string;
  };
  encryptionKeyConfigured: boolean;
  canValidate: boolean;
};

function assertAdmin(actor: ActorContext) {
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "관리자만 접근할 수 있습니다.");
  }
}

function envFromDb(
  env: BillingKeyEnvironment,
): BillingProviderEnvironment {
  return env === "TEST"
    ? BillingProviderEnvironment.TEST
    : BillingProviderEnvironment.LIVE;
}

export const adminBillingSettingsService = {
  async getSettingsPage(actor: ActorContext): Promise<AdminBillingSettingsVM> {
    assertAdmin(actor);
    const [diagnostics, runtime, resolved] = await Promise.all([
      getBillingSettingsDiagnostics(),
      billingProviderConfigRepository.getRuntimeConfig(),
      resolveBillingProviderConfig(),
    ]);

    const testSlot =
      diagnostics.slots.find((s) => s.environment === "TEST")!;
    const liveSlot =
      diagnostics.slots.find((s) => s.environment === "LIVE")!;
    const testLabels = providerSlotStatus(testSlot);
    const liveLabels = providerSlotStatus(liveSlot);

    return {
      diagnostics,
      connectionLabel: formatConnectionStatusLabel(resolved.connectionStatus),
      readinessLabel: formatBillingReadinessLabel({
        testClient: testSlot.clientKeyConfigured,
        testSecret: testSlot.secretKeyConfigured,
        liveClient: liveSlot.clientKeyConfigured,
        liveSecret: liveSlot.secretKeyConfigured,
        encryptionKeyConfigured: diagnostics.encryptionKeyConfigured,
        runtimeProvider: diagnostics.runtimeProvider,
        runtimeEnvironment: diagnostics.runtimeEnvironment,
        runtimeEnabled: diagnostics.runtimeEnabled,
        activePlanCount: diagnostics.activePlanCount,
      }),
      runtime: {
        provider: runtime.provider,
        environment: runtime.environment,
        enabled: runtime.enabled,
      },
      test: {
        clientKeyMasked: testSlot.clientKeyMasked,
        clientKeyConfigured: testSlot.clientKeyConfigured,
        secretKeyConfigured: testSlot.secretKeyConfigured,
        clientLabel: testLabels.clientLabel,
        secretLabel: testLabels.secretLabel,
      },
      live: {
        clientKeyMasked: liveSlot.clientKeyMasked,
        clientKeyConfigured: liveSlot.clientKeyConfigured,
        secretKeyConfigured: liveSlot.secretKeyConfigured,
        clientLabel: liveLabels.clientLabel,
        secretLabel: liveLabels.secretLabel,
      },
      encryptionKeyConfigured: diagnostics.encryptionKeyConfigured,
      canValidate:
        resolved.clientKey != null && resolved.secretKey != null,
    };
  },

  async saveProviderCredentials(
    actor: ActorContext,
    input: {
      environment: BillingKeyEnvironment;
      clientKey?: string;
      secretKey?: string;
    },
  ) {
    assertAdmin(actor);
    const dbEnv = envFromDb(input.environment);
    const existing =
      await billingProviderConfigRepository.getProviderConfig(
        BillingProviderKind.TOSS,
        dbEnv,
      );

    const clientKeyInput = input.clientKey?.trim();
    const secretKeyInput = input.secretKey?.trim();

    let clientKey = existing?.clientKey ?? null;
    let clientChanged = false;
    if (clientKeyInput) {
      const err = validateClientKeyForEnvironment(clientKeyInput, input.environment);
      if (err) throw new AppError("VALIDATION_ERROR", err);
      clientKey = clientKeyInput;
      clientChanged = clientKeyInput !== existing?.clientKey;
    }

    let secretChanged = false;
    let secretBlob: ReturnType<typeof encryptBillingSecret> | null = null;
    if (secretKeyInput) {
      const err = validateSecretKeyForEnvironment(
        secretKeyInput,
        input.environment,
      );
      if (err) throw new AppError("VALIDATION_ERROR", err);
      if (clientKey) {
        const pairErr = validateKeyPairConsistency(clientKey, secretKeyInput);
        if (pairErr) throw new AppError("VALIDATION_ERROR", pairErr);
      }
      if (!isBillingCredentialEncryptionConfigured()) {
        throw new AppError(
          "INTERNAL",
          "서버 암호화 키가 설정되지 않아 Secret을 저장할 수 없습니다.",
        );
      }
      secretBlob = encryptBillingSecret(secretKeyInput);
      secretChanged = true;
    }

    if (!clientKey && !existing?.clientKey && !clientKeyInput) {
      throw new AppError("VALIDATION_ERROR", "Client Key를 입력하세요.");
    }

    await prisma.$transaction(async (tx) => {
      await billingProviderConfigRepository.upsertProviderConfig(
        {
          provider: BillingProviderKind.TOSS,
          environment: dbEnv,
          clientKey: clientKeyInput ? clientKey : undefined,
          secretKeyCipher: secretBlob?.cipher ?? undefined,
          secretKeyIv: secretBlob?.iv ?? undefined,
          secretKeyAuthTag: secretBlob?.authTag ?? undefined,
          secretKeyKeyVer: secretBlob?.keyVer ?? undefined,
          updatedByUserId: actor.userId,
        },
        tx,
      );

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.system_setting_changed,
          targetType: "BillingProviderConfig",
          targetId: `TOSS_${input.environment}`,
          beforeData: {
            clientKeyConfigured: Boolean(existing?.clientKey),
            secretKeyConfigured: Boolean(existing?.secretKeyCipher),
          },
          afterData: {
            clientKeyConfigured: Boolean(clientKey ?? existing?.clientKey),
            secretKeyConfigured:
              secretChanged || Boolean(existing?.secretKeyCipher),
            clientKeyChanged: clientChanged,
            secretKeyChanged: secretChanged,
          },
        },
        tx,
      );
    });

    invalidateBillingProviderConfigCache();

    return {
      clientKeyMasked: maskClientKey(clientKey ?? existing?.clientKey),
      secretKeyConfigured:
        secretChanged || Boolean(existing?.secretKeyCipher),
    };
  },

  async deleteProviderSecret(actor: ActorContext, environment: BillingKeyEnvironment) {
    assertAdmin(actor);
    const dbEnv = envFromDb(environment);
    const existing =
      await billingProviderConfigRepository.getProviderConfig(
        BillingProviderKind.TOSS,
        dbEnv,
      );
    if (!existing?.secretKeyCipher) {
      throw new AppError("VALIDATION_ERROR", "삭제할 Secret Key가 없습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await billingProviderConfigRepository.upsertProviderConfig(
        {
          provider: BillingProviderKind.TOSS,
          environment: dbEnv,
          clearSecret: true,
          updatedByUserId: actor.userId,
        },
        tx,
      );
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.system_setting_changed,
          targetType: "BillingProviderConfig",
          targetId: `TOSS_${environment}`,
          beforeData: { secretKeyConfigured: true },
          afterData: { secretKeyConfigured: false, secretKeyDeleted: true },
        },
        tx,
      );
    });

    invalidateBillingProviderConfigCache();
  },

  async updateRuntime(
    actor: ActorContext,
    input: {
      provider: BillingProviderKind;
      environment: BillingProviderEnvironment | null;
      enabled: boolean;
    },
  ) {
    assertAdmin(actor);

    if (input.enabled) {
      if (input.provider !== BillingProviderKind.TOSS || !input.environment) {
        throw new AppError(
          "VALIDATION_ERROR",
          "결제 연동 활성화에는 Provider와 환경(TEST/LIVE) 선택이 필요합니다.",
        );
      }
      const slot = (
        await getBillingSettingsDiagnostics()
      ).slots.find((s) => s.environment === input.environment);
      if (!slot?.clientKeyConfigured || !slot?.secretKeyConfigured) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Client Key와 Secret Key가 모두 등록되어야 결제 연동을 활성화할 수 있습니다.",
        );
      }
    }

    const before = await billingProviderConfigRepository.getRuntimeConfig();

    await prisma.$transaction(async (tx) => {
      await billingProviderConfigRepository.upsertRuntimeConfig(
        {
          provider: input.enabled ? input.provider : BillingProviderKind.NONE,
          environment: input.enabled ? input.environment : null,
          enabled: input.enabled,
          updatedByUserId: actor.userId,
        },
        tx,
      );
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.system_setting_changed,
          targetType: "BillingRuntimeConfig",
          targetId: "default",
          beforeData: {
            provider: before.provider,
            environment: before.environment,
            enabled: before.enabled,
          },
          afterData: {
            provider: input.enabled ? input.provider : BillingProviderKind.NONE,
            environment: input.enabled ? input.environment : null,
            enabled: input.enabled,
          },
        },
        tx,
      );
    });

    invalidateBillingProviderConfigCache();
  },

  async validateSettings(actor: ActorContext) {
    assertAdmin(actor);
    const cfg = await resolveBillingProviderConfig();
    if (!cfg.clientKey || !cfg.secretKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "활성 환경의 Client Key와 Secret Key가 모두 등록되어야 합니다.",
      );
    }
    const ckErr =
      cfg.environment === "LIVE"
        ? validateClientKeyForEnvironment(cfg.clientKey, "LIVE")
        : validateClientKeyForEnvironment(cfg.clientKey, "TEST");
    if (ckErr) throw new AppError("VALIDATION_ERROR", ckErr);
    const skErr =
      cfg.environment === "LIVE"
        ? validateSecretKeyForEnvironment(cfg.secretKey, "LIVE")
        : validateSecretKeyForEnvironment(cfg.secretKey, "TEST");
    if (skErr) throw new AppError("VALIDATION_ERROR", skErr);
    const pairErr = validateKeyPairConsistency(cfg.clientKey, cfg.secretKey);
    if (pairErr) throw new AppError("VALIDATION_ERROR", pairErr);

    return {
      ok: true as const,
      message:
        "키 형식 및 설정 준비가 완료되었습니다. 실제 결제 검증은 TEST E2E에서 진행하세요.",
      environment: cfg.environment,
      enabled: cfg.enabled,
      connectionStatus: cfg.connectionStatus,
    };
  },
};
