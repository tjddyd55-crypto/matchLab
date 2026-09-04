import { MessagingProviderKind } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const DEFAULT_ID = "default";

export const platformMessagingProviderConfigRepository = {
  async getDefault() {
    return prisma.platformMessagingProviderConfig.findUnique({
      where: { id: DEFAULT_ID },
    });
  },

  async upsert(params: {
    loginId: string | null;
    senderPhone: string | null;
    apiKeyCipher?: Uint8Array | null;
    apiKeyIv?: Uint8Array | null;
    apiKeyAuthTag?: Uint8Array | null;
    apiKeyKeyVer?: string | null;
    updatedByUserId: string;
  }) {
    const existing = await this.getDefault();
    const apiKeyUpdate =
      params.apiKeyCipher !== undefined
        ? {
            apiKeyCipher: params.apiKeyCipher
              ? Buffer.from(params.apiKeyCipher)
              : null,
            apiKeyIv: params.apiKeyIv ? Buffer.from(params.apiKeyIv) : null,
            apiKeyAuthTag: params.apiKeyAuthTag
              ? Buffer.from(params.apiKeyAuthTag)
              : null,
            apiKeyKeyVer: params.apiKeyKeyVer ?? null,
          }
        : {};

    if (existing) {
      return prisma.platformMessagingProviderConfig.update({
        where: { id: DEFAULT_ID },
        data: {
          loginId: params.loginId,
          senderPhone: params.senderPhone,
          updatedByUserId: params.updatedByUserId,
          ...apiKeyUpdate,
        },
      });
    }

    return prisma.platformMessagingProviderConfig.create({
      data: {
        id: DEFAULT_ID,
        provider: MessagingProviderKind.aligo,
        loginId: params.loginId,
        senderPhone: params.senderPhone,
        updatedByUserId: params.updatedByUserId,
        ...(params.apiKeyCipher != null
          ? {
              apiKeyCipher: Buffer.from(params.apiKeyCipher),
              apiKeyIv: params.apiKeyIv ? Buffer.from(params.apiKeyIv) : null,
              apiKeyAuthTag: params.apiKeyAuthTag
                ? Buffer.from(params.apiKeyAuthTag)
                : null,
              apiKeyKeyVer: params.apiKeyKeyVer ?? null,
            }
          : {
              apiKeyCipher: null,
              apiKeyIv: null,
              apiKeyAuthTag: null,
              apiKeyKeyVer: null,
            }),
      },
    });
  },
};
