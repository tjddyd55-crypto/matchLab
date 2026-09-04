import {
  PlatformFeatureTargetType,
  TenantFeatureEntitlementSource,
  TenantFeatureOwnerType,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { TenantFeatureKey } from "@/lib/platform-features/tenant-feature-keys";

export const tenantFeatureEntitlementRepository = {
  async findEntitlement(
    ownerType: TenantFeatureOwnerType,
    ownerId: string,
    featureKey: TenantFeatureKey,
  ) {
    return prisma.tenantFeatureEntitlement.findUnique({
      where: {
        ownerType_ownerId_featureKey: {
          ownerType,
          ownerId,
          featureKey,
        },
      },
    });
  },

  async listFeaturesForTarget(target: "association" | "gym") {
    const targetTypes =
      target === "association"
        ? [PlatformFeatureTargetType.association, PlatformFeatureTargetType.both]
        : [PlatformFeatureTargetType.gym, PlatformFeatureTargetType.both];

    return prisma.platformFeature.findMany({
      where: {
        active: true,
        targetType: { in: targetTypes },
      },
      orderBy: { name: "asc" },
    });
  },

  async listEntitlementsForOwner(
    ownerType: TenantFeatureOwnerType,
    ownerId: string,
  ) {
    return prisma.tenantFeatureEntitlement.findMany({
      where: { ownerType, ownerId },
      include: { feature: true },
    });
  },

  async upsertAdminEntitlement(params: {
    ownerType: TenantFeatureOwnerType;
    ownerId: string;
    featureKey: TenantFeatureKey;
    enabled: boolean;
  }) {
    const existing = await this.findEntitlement(
      params.ownerType,
      params.ownerId,
      params.featureKey,
    );

    if (existing) {
      return prisma.tenantFeatureEntitlement.update({
        where: { id: existing.id },
        data: {
          enabled: params.enabled,
          source: TenantFeatureEntitlementSource.admin,
        },
      });
    }

    return prisma.tenantFeatureEntitlement.create({
      data: {
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        featureKey: params.featureKey,
        enabled: params.enabled,
        source: TenantFeatureEntitlementSource.admin,
      },
    });
  },
};
