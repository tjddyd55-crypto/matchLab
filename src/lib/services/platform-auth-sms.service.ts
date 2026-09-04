import "server-only";

import type { ActorContext } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  decryptMessagingApiKey,
  encryptMessagingApiKey,
  isMessagingCredentialEncryptionConfigured,
  maskMessagingApiKeyHint,
} from "@/lib/messaging/messaging-credential-crypto";
import { normalizeMessagingPhone } from "@/lib/messaging/messaging-phone";
import { platformMessagingProviderConfigRepository } from "@/lib/repositories/platform-messaging-provider-config.repository";
import {
  canMatchonAuthSmsRealSend,
  getMatchonPhoneVerificationRuntimeStatus,
  loadMatchonPhoneVerificationConfig,
  type MatchonPhoneVerificationConfig,
} from "@/server/phone-verification/config/matchon-phone-verification-config";
import { testTenantAligoConnection } from "@/server/messaging/services/tenant-aligo-connection-test";

export type PlatformAuthAligoCredentials = {
  loginId: string;
  apiKey: string;
  senderPhone: string;
};

export type PlatformAuthSmsRuntimeVM = {
  signupEnabled: boolean;
  passwordResetEnabled: boolean;
  provider: string;
  dryRun: boolean;
  realSendAllowed: boolean;
  credentialsConfigured: boolean;
  credentialsSource: "database" | "environment" | "none";
  encryptionKeyConfigured: boolean;
  productionReady: boolean;
  blockingReason: string | null;
};

function classifyAligoConnectionError(providerMessage: string): string {
  const msg = providerMessage.toLowerCase();
  if (
    msg.includes("ip") ||
    msg.includes("허용") ||
    msg.includes("whitelist") ||
    msg.includes("access")
  ) {
    return "알리고 API 접속이 허용되지 않았습니다. 등록된 허용 IP를 확인해 주세요.";
  }
  if (
    msg.includes("auth") ||
    msg.includes("인증") ||
    msg.includes("key") ||
    msg.includes("user_id") ||
    msg.includes("아이디")
  ) {
    return "알리고 계정 정보를 확인해 주세요.";
  }
  return "알리고 연결 확인에 실패했습니다.";
}

function envAligoCredentials(
  config: MatchonPhoneVerificationConfig,
): PlatformAuthAligoCredentials | null {
  if (!config.aligo.apiKey || !config.aligo.userId || !config.aligo.sender) {
    return null;
  }
  return {
    loginId: config.aligo.userId,
    apiKey: config.aligo.apiKey,
    senderPhone: config.aligo.sender,
  };
}

export const platformAuthSmsService = {
  async resolveAligoCredentials(): Promise<{
    credentials: PlatformAuthAligoCredentials | null;
    source: PlatformAuthSmsRuntimeVM["credentialsSource"];
  }> {
    const row = await platformMessagingProviderConfigRepository.getDefault();
    const dbApiKey = row ? decryptMessagingApiKey(row) : null;
    if (row?.loginId && dbApiKey && row.senderPhone) {
      return {
        credentials: {
          loginId: row.loginId,
          apiKey: dbApiKey,
          senderPhone: normalizeMessagingPhone(row.senderPhone) ?? row.senderPhone,
        },
        source: "database",
      };
    }

    const envCreds = envAligoCredentials(loadMatchonPhoneVerificationConfig());
    if (envCreds) {
      return { credentials: envCreds, source: "environment" };
    }

    return { credentials: null, source: "none" };
  },

  async loadPhoneVerificationConfigWithCredentials(): Promise<MatchonPhoneVerificationConfig> {
    const config = loadMatchonPhoneVerificationConfig();
    const { credentials } = await this.resolveAligoCredentials();
    if (!credentials || config.provider !== "aligo") {
      return config;
    }
    return {
      ...config,
      aligo: {
        ...config.aligo,
        apiKey: credentials.apiKey,
        userId: credentials.loginId,
        sender: credentials.senderPhone,
      },
    };
  },

  canRealSend(config: MatchonPhoneVerificationConfig): boolean {
    return canMatchonAuthSmsRealSend(config);
  },

  async getRuntimeStatus(): Promise<PlatformAuthSmsRuntimeVM> {
    const config = await this.loadPhoneVerificationConfigWithCredentials();
    const base = getMatchonPhoneVerificationRuntimeStatus();
    const { source } = await this.resolveAligoCredentials();
    const credentialsConfigured = Boolean(
      config.aligo.apiKey && config.aligo.userId && config.aligo.sender,
    );
    const realSendAllowed = canMatchonAuthSmsRealSend(config);

    return {
      signupEnabled: base.signupEnabled,
      passwordResetEnabled: base.passwordResetEnabled,
      provider: config.provider,
      dryRun: config.dryRun,
      realSendAllowed,
      credentialsConfigured,
      credentialsSource: source,
      encryptionKeyConfigured: isMessagingCredentialEncryptionConfigured(),
      productionReady: base.productionReady && credentialsConfigured,
      blockingReason: credentialsConfigured ? base.blockingReason : "credentials_incomplete",
    };
  },

  async testConnection(
    input?: {
      loginId?: string;
      apiKey?: string;
      senderPhone?: string;
    },
    actor?: ActorContext,
  ): Promise<{ ok: boolean; message: string }> {
    if (actor && actor.role !== "admin") {
      throw new AppError("FORBIDDEN", "관리자만 연결을 확인할 수 있습니다.");
    }

    let credentials: PlatformAuthAligoCredentials | null = null;
    if (input?.loginId && input?.apiKey && input?.senderPhone) {
      credentials = {
        loginId: input.loginId.trim(),
        apiKey: input.apiKey.trim(),
        senderPhone:
          normalizeMessagingPhone(input.senderPhone) ?? input.senderPhone.trim(),
      };
    } else {
      const resolved = await this.resolveAligoCredentials();
      credentials = resolved.credentials;
    }

    if (!credentials?.loginId || !credentials.apiKey) {
      return {
        ok: false,
        message: "알리고 계정 정보를 입력해 주세요.",
      };
    }

    const result = await testTenantAligoConnection({
      loginId: credentials.loginId,
      apiKey: credentials.apiKey,
      senderPhone: credentials.senderPhone ?? "",
    });

    if (result.ok) {
      return result;
    }

    return {
      ok: false,
      message: classifyAligoConnectionError(result.message),
    };
  },
};

export type AdminPlatformMessagingSettingsVM = {
  loginId: string;
  senderPhone: string;
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  encryptionKeyConfigured: boolean;
  runtime: PlatformAuthSmsRuntimeVM;
};

function assertAdmin(actor: ActorContext) {
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "관리자만 접근할 수 있습니다.");
  }
}

export const adminPlatformMessagingSettingsService = {
  async getSettings(actor: ActorContext): Promise<AdminPlatformMessagingSettingsVM> {
    assertAdmin(actor);
    const row = await platformMessagingProviderConfigRepository.getDefault();
    const apiKey = row ? decryptMessagingApiKey(row) : null;
    const runtime = await platformAuthSmsService.getRuntimeStatus();
    return {
      loginId: row?.loginId ?? "",
      senderPhone: row?.senderPhone ?? "",
      apiKeyMasked: maskMessagingApiKeyHint(apiKey),
      apiKeyConfigured: Boolean(apiKey),
      encryptionKeyConfigured: isMessagingCredentialEncryptionConfigured(),
      runtime,
    };
  },

  async saveSettings(
    actor: ActorContext,
    input: {
      loginId: string;
      senderPhone: string;
      apiKey?: string;
    },
  ) {
    assertAdmin(actor);
    if (!isMessagingCredentialEncryptionConfigured() && input.apiKey?.trim()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "암호화 키가 설정되지 않아 API Key를 저장할 수 없습니다.",
      );
    }

    const loginId = input.loginId.trim();
    const senderPhone =
      normalizeMessagingPhone(input.senderPhone) ?? input.senderPhone.trim();
    const apiKeyInput = input.apiKey?.trim() ?? "";

    let apiKeyCipher: Uint8Array | null = null;
    let apiKeyIv: Uint8Array | null = null;
    let apiKeyAuthTag: Uint8Array | null = null;
    let apiKeyKeyVer: string | null = null;

    if (apiKeyInput) {
      const encrypted = encryptMessagingApiKey(apiKeyInput);
      apiKeyCipher = encrypted.cipher;
      apiKeyIv = encrypted.iv;
      apiKeyAuthTag = encrypted.authTag;
      apiKeyKeyVer = encrypted.keyVer;
    }

    await platformMessagingProviderConfigRepository.upsert({
      loginId: loginId || null,
      senderPhone: senderPhone || null,
      apiKeyCipher,
      apiKeyIv,
      apiKeyAuthTag,
      apiKeyKeyVer,
      updatedByUserId: actor.userId,
    });

    return this.getSettings(actor);
  },

  async testConnection(
    actor: ActorContext,
    input?: { loginId?: string; apiKey?: string; senderPhone?: string },
  ) {
    assertAdmin(actor);
    return platformAuthSmsService.testConnection(input, actor);
  },
};
