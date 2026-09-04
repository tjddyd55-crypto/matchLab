import "server-only";

import {
  MessagingProviderKind,
  MessagingProviderOwnerType,
  TenantFeatureOwnerType,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  decryptMessagingApiKey,
  encryptMessagingApiKey,
  isMessagingCredentialEncryptionConfigured,
  maskMessagingApiKeyHint,
} from "@/lib/messaging/messaging-credential-crypto";
import { normalizeMessagingPhone } from "@/lib/messaging/messaging-phone";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { messagingProviderConfigRepository } from "@/lib/repositories/messaging-provider-config.repository";
import { tenantFeatureEntitlementService } from "@/lib/services/tenant-feature-entitlement.service";
import { prisma } from "@/lib/prisma";
import { testTenantAligoConnection } from "@/server/messaging/services/tenant-aligo-connection-test";

export type MessagingProviderSettingsVM = {
  ownerType: MessagingProviderOwnerType;
  ownerId: string;
  loginId: string;
  senderPhone: string;
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  encryptionKeyConfigured: boolean;
  messagingFeatureEnabled: boolean;
};

function assertAssociationActor(actor: ActorContext): string {
  requireAssociationOrganizerPage(actor);
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "협회 정보를 확인할 수 없습니다.");
  }
  return actor.organizerId;
}

async function assertGymActor(actor: ActorContext): Promise<string> {
  const access = await resolveGymPortalAccess(actor);
  if (!access.canManageGymSettings) {
    throw new AppError("FORBIDDEN", "체육관 설정을 변경할 권한이 없습니다.");
  }
  return access.gymId;
}

async function assertOwnerAccess(
  actor: ActorContext,
  ownerType: MessagingProviderOwnerType,
): Promise<string> {
  if (ownerType === MessagingProviderOwnerType.association) {
    return assertAssociationActor(actor);
  }
  return assertGymActor(actor);
}

async function assertOwnerTenant(
  ownerType: MessagingProviderOwnerType,
  ownerId: string,
  actorOwnerId: string,
) {
  if (ownerId !== actorOwnerId) {
    throw new AppError("FORBIDDEN", "다른 tenant 설정에 접근할 수 없습니다.");
  }
}

function toTenantFeatureOwnerType(
  ownerType: MessagingProviderOwnerType,
): TenantFeatureOwnerType {
  return ownerType === MessagingProviderOwnerType.association
    ? TenantFeatureOwnerType.association
    : TenantFeatureOwnerType.gym;
}

export const messagingProviderSettingsService = {
  async getSettings(
    actor: ActorContext,
    ownerType: MessagingProviderOwnerType,
  ): Promise<MessagingProviderSettingsVM> {
    const ownerId = await assertOwnerAccess(actor, ownerType);
    const row = await messagingProviderConfigRepository.findByOwner(
      ownerType,
      ownerId,
    );
    const apiKey = row ? decryptMessagingApiKey(row) : null;
    const messagingFeatureEnabled =
      await tenantFeatureEntitlementService.hasTenantFeature(
        toTenantFeatureOwnerType(ownerType),
        ownerId,
        "TENANT_MESSAGING",
      );
    return {
      ownerType,
      ownerId,
      loginId: row?.loginId ?? "",
      senderPhone: row?.senderPhone ?? "",
      apiKeyMasked: maskMessagingApiKeyHint(apiKey),
      apiKeyConfigured: Boolean(apiKey),
      encryptionKeyConfigured: isMessagingCredentialEncryptionConfigured(),
      messagingFeatureEnabled,
    };
  },

  async saveSettings(
    actor: ActorContext,
    ownerType: MessagingProviderOwnerType,
    input: {
      loginId: string;
      senderPhone: string;
      apiKey?: string;
    },
  ) {
    const ownerId = await assertOwnerAccess(actor, ownerType);
    await assertOwnerTenant(ownerType, ownerId, ownerId);

    const loginId = input.loginId.trim();
    const senderPhone = normalizeMessagingPhone(input.senderPhone);
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

    await messagingProviderConfigRepository.upsert({
      ownerType,
      ownerId,
      loginId: loginId || null,
      senderPhone: senderPhone || null,
      apiKeyCipher,
      apiKeyIv,
      apiKeyAuthTag,
      apiKeyKeyVer,
      updatedByUserId: actor.userId,
    });

    return this.getSettings(actor, ownerType);
  },

  async testConnection(
    actor: ActorContext,
    ownerType: MessagingProviderOwnerType,
    input?: {
      loginId?: string;
      apiKey?: string;
      senderPhone?: string;
    },
  ) {
    const ownerId = await assertOwnerAccess(actor, ownerType);
    const existing = await messagingProviderConfigRepository.findByOwner(
      ownerType,
      ownerId,
    );

    const loginId = (input?.loginId?.trim() || existing?.loginId || "").trim();
    const senderPhone = normalizeMessagingPhone(
      input?.senderPhone || existing?.senderPhone,
    );
    const apiKey =
      input?.apiKey?.trim() || (existing ? decryptMessagingApiKey(existing) : "");

    if (!loginId || !apiKey || !senderPhone) {
      throw new AppError(
        "VALIDATION_ERROR",
        "알리고 아이디, API Key, 발신번호를 모두 입력해 주세요.",
      );
    }

    const result = await testTenantAligoConnection({
      loginId,
      apiKey,
      senderPhone,
    });

    if (!result.ok) {
      throw new AppError("INTERNAL", result.message);
    }

    return { message: "알리고 연결이 확인되었습니다." };
  },

  async resolveDecryptedConfig(
    ownerType: MessagingProviderOwnerType,
    ownerId: string,
  ) {
    const row = await messagingProviderConfigRepository.findByOwner(
      ownerType,
      ownerId,
    );
    if (!row) return null;
    const apiKey = decryptMessagingApiKey(row);
    if (!row.loginId || !apiKey || !row.senderPhone) return null;
    return {
      ownerType,
      ownerId,
      provider: row.provider,
      loginId: row.loginId,
      apiKey,
      senderPhone: normalizeMessagingPhone(row.senderPhone),
    };
  },

  /** 대회 신청자 발송용 — 협회 organizer credential */
  async resolveAssociationConfigForOrganizer(organizerId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { id: true, type: true },
    });
    if (!organizer || organizer.type !== "association") {
      return null;
    }
    return this.resolveDecryptedConfig(
      MessagingProviderOwnerType.association,
      organizerId,
    );
  },
};
