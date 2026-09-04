import type { Prisma } from "@/generated/prisma";
import {
  MessagingProviderKind,
  MessagingProviderOwnerType,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const messagingProviderConfigRepository = {
  async findByOwner(
    ownerType: MessagingProviderOwnerType,
    ownerId: string,
    provider: MessagingProviderKind = MessagingProviderKind.aligo,
  ) {
    return prisma.messagingProviderConfig.findUnique({
      where: {
        ownerType_ownerId_provider: { ownerType, ownerId, provider },
      },
    });
  },

  async upsert(params: {
    ownerType: MessagingProviderOwnerType;
    ownerId: string;
    provider?: MessagingProviderKind;
    enabled: boolean;
    loginId: string | null;
    senderPhone: string | null;
    apiKeyCipher?: Uint8Array | null;
    apiKeyIv?: Uint8Array | null;
    apiKeyAuthTag?: Uint8Array | null;
    apiKeyKeyVer?: string | null;
    clearApiKey?: boolean;
    updatedByUserId?: string | null;
  }) {
    const provider = params.provider ?? MessagingProviderKind.aligo;
    const existing = await this.findByOwner(
      params.ownerType,
      params.ownerId,
      provider,
    );

    const apiKeyUpdate = params.clearApiKey
      ? {
          apiKeyCipher: null,
          apiKeyIv: null,
          apiKeyAuthTag: null,
          apiKeyKeyVer: null,
        }
      : params.apiKeyCipher != null
        ? {
            apiKeyCipher: Buffer.from(params.apiKeyCipher),
            apiKeyIv: params.apiKeyIv ? Buffer.from(params.apiKeyIv) : null,
            apiKeyAuthTag: params.apiKeyAuthTag
              ? Buffer.from(params.apiKeyAuthTag)
              : null,
            apiKeyKeyVer: params.apiKeyKeyVer ?? null,
          }
        : {};

    if (existing) {
      return prisma.messagingProviderConfig.update({
        where: { id: existing.id },
        data: {
          enabled: params.enabled,
          loginId: params.loginId,
          senderPhone: params.senderPhone,
          updatedByUserId: params.updatedByUserId ?? null,
          ...apiKeyUpdate,
        },
      });
    }

    return prisma.messagingProviderConfig.create({
      data: {
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        provider,
        enabled: params.enabled,
        loginId: params.loginId,
        senderPhone: params.senderPhone,
        updatedByUserId: params.updatedByUserId ?? null,
        ...(params.apiKeyCipher != null
          ? {
              apiKeyCipher: Buffer.from(params.apiKeyCipher),
              apiKeyIv: params.apiKeyIv ? Buffer.from(params.apiKeyIv) : null,
              apiKeyAuthTag: params.apiKeyAuthTag
                ? Buffer.from(params.apiKeyAuthTag)
                : null,
              apiKeyKeyVer: params.apiKeyKeyVer ?? null,
            }
          : {}),
      },
    });
  },
};
