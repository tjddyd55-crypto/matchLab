import "server-only";

import {
  TenantFeatureOwnerType,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  TENANT_FEATURE_KEYS,
  type TenantFeatureKey,
} from "@/lib/platform-features/tenant-feature-keys";
import { requireRole } from "@/lib/permissions";
import { tenantFeatureEntitlementRepository } from "@/lib/repositories/tenant-feature-entitlement.repository";

export type TenantFeatureEntitlementVM = {
  featureKey: string;
  name: string;
  description: string | null;
  enabled: boolean;
  source: string;
};

function assertSuperAdmin(actor: ActorContext): void {
  requireRole(actor, ["admin"]);
}

function toOwnerType(kind: "association" | "gym"): TenantFeatureOwnerType {
  return kind === "association"
    ? TenantFeatureOwnerType.association
    : TenantFeatureOwnerType.gym;
}

export const tenantFeatureEntitlementService = {
  async hasTenantFeature(
    ownerType: TenantFeatureOwnerType,
    ownerId: string,
    featureKey: TenantFeatureKey,
  ): Promise<boolean> {
    const row = await tenantFeatureEntitlementRepository.findEntitlement(
      ownerType,
      ownerId,
      featureKey,
    );
    return row?.enabled === true;
  },

  async requireTenantFeature(
    ownerType: TenantFeatureOwnerType,
    ownerId: string,
    featureKey: TenantFeatureKey,
    message = "이 기능을 사용할 수 없는 계정입니다. 관리자에게 문의해 주세요.",
  ): Promise<void> {
    const enabled = await this.hasTenantFeature(ownerType, ownerId, featureKey);
    if (!enabled) {
      throw new AppError("FORBIDDEN", message);
    }
  },

  async requireTenantMessaging(
    ownerType: TenantFeatureOwnerType,
    ownerId: string,
  ): Promise<void> {
    await this.requireTenantFeature(
      ownerType,
      ownerId,
      TENANT_FEATURE_KEYS.TENANT_MESSAGING,
      "문자 서비스를 사용할 수 없는 계정입니다. 관리자에게 문의해 주세요.",
    );
  },

  async listAdminTenantFeatures(
    actor: ActorContext,
    kind: "association" | "gym",
    ownerId: string,
  ): Promise<TenantFeatureEntitlementVM[]> {
    assertSuperAdmin(actor);

    const ownerType = toOwnerType(kind);
    const features =
      await tenantFeatureEntitlementRepository.listFeaturesForTarget(kind);
    const entitlements =
      await tenantFeatureEntitlementRepository.listEntitlementsForOwner(
        ownerType,
        ownerId,
      );
    const byKey = new Map(
      entitlements.map((row) => [row.featureKey, row]),
    );

    return features.map((feature) => {
      const row = byKey.get(feature.key);
      return {
        featureKey: feature.key,
        name: feature.name,
        description: feature.description,
        enabled: row?.enabled ?? false,
        source: row?.source ?? "admin",
      };
    });
  },

  async setAdminTenantFeature(
    actor: ActorContext,
    input: {
      kind: "association" | "gym";
      ownerId: string;
      featureKey: TenantFeatureKey;
      enabled: boolean;
    },
  ): Promise<TenantFeatureEntitlementVM[]> {
    assertSuperAdmin(actor);

    const ownerType = toOwnerType(input.kind);
    const features =
      await tenantFeatureEntitlementRepository.listFeaturesForTarget(
        input.kind,
      );
    const allowed = features.some((f) => f.key === input.featureKey);
    if (!allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이 조직 유형에서 설정할 수 없는 기능입니다.",
      );
    }

    await tenantFeatureEntitlementRepository.upsertAdminEntitlement({
      ownerType,
      ownerId: input.ownerId,
      featureKey: input.featureKey,
      enabled: input.enabled,
    });

    return this.listAdminTenantFeatures(actor, input.kind, input.ownerId);
  },
};
