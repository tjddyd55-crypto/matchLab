import type { Prisma } from "@/generated/prisma";
import {
  BillingProviderEnvironment,
  BillingProviderKind,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const billingProviderConfigRepository = {
  async getRuntimeConfig(tx?: Prisma.TransactionClient) {
    const row = await db(tx).billingRuntimeConfig.findUnique({
      where: { id: "default" },
    });
    if (row) return row;
    return db(tx).billingRuntimeConfig.create({
      data: {
        id: "default",
        provider: BillingProviderKind.NONE,
        enabled: false,
      },
    });
  },

  async upsertRuntimeConfig(
    data: {
      provider: BillingProviderKind;
      environment: BillingProviderEnvironment | null;
      enabled: boolean;
      updatedByUserId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).billingRuntimeConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        provider: data.provider,
        environment: data.environment,
        enabled: data.enabled,
        updatedByUserId: data.updatedByUserId,
      },
      update: {
        provider: data.provider,
        environment: data.environment,
        enabled: data.enabled,
        updatedByUserId: data.updatedByUserId,
      },
    });
  },

  async listProviderConfigs(tx?: Prisma.TransactionClient) {
    return db(tx).billingProviderConfig.findMany({
      orderBy: [{ provider: "asc" }, { environment: "asc" }],
    });
  },

  async getProviderConfig(
    provider: BillingProviderKind,
    environment: BillingProviderEnvironment,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).billingProviderConfig.findUnique({
      where: {
        provider_environment: { provider, environment },
      },
    });
  },

  async upsertProviderConfig(
    data: {
      provider: BillingProviderKind;
      environment: BillingProviderEnvironment;
      clientKey?: string | null;
      secretKeyCipher?: Uint8Array | null;
      secretKeyIv?: Uint8Array | null;
      secretKeyAuthTag?: Uint8Array | null;
      secretKeyKeyVer?: string | null;
      clearSecret?: boolean;
      updatedByUserId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const existing = await this.getProviderConfig(
      data.provider,
      data.environment,
      tx,
    );

    const secretUpdate = data.clearSecret
      ? {
          secretKeyCipher: null,
          secretKeyIv: null,
          secretKeyAuthTag: null,
          secretKeyKeyVer: null,
        }
      : data.secretKeyCipher != null
        ? {
            secretKeyCipher: Buffer.from(data.secretKeyCipher),
            secretKeyIv: data.secretKeyIv
              ? Buffer.from(data.secretKeyIv)
              : null,
            secretKeyAuthTag: data.secretKeyAuthTag
              ? Buffer.from(data.secretKeyAuthTag)
              : null,
            secretKeyKeyVer: data.secretKeyKeyVer ?? null,
          }
        : {};

    const clientUpdate =
      data.clientKey !== undefined ? { clientKey: data.clientKey } : {};

    if (existing) {
      return db(tx).billingProviderConfig.update({
        where: { id: existing.id },
        data: {
          ...clientUpdate,
          ...secretUpdate,
          updatedByUserId: data.updatedByUserId,
        },
      });
    }

    return db(tx).billingProviderConfig.create({
      data: {
        provider: data.provider,
        environment: data.environment,
        clientKey: data.clientKey ?? null,
        ...(data.secretKeyCipher
          ? {
              secretKeyCipher: Buffer.from(data.secretKeyCipher),
              secretKeyIv: data.secretKeyIv
                ? Buffer.from(data.secretKeyIv)
                : null,
              secretKeyAuthTag: data.secretKeyAuthTag
                ? Buffer.from(data.secretKeyAuthTag)
                : null,
              secretKeyKeyVer: data.secretKeyKeyVer ?? null,
            }
          : {}),
        updatedByUserId: data.updatedByUserId,
      },
    });
  },
};
