"use server";

import type { TenantFeatureKey } from "@/lib/platform-features/tenant-feature-keys";
import { requireActor } from "@/lib/auth/actor";
import {
  tenantFeatureEntitlementService,
  type TenantFeatureEntitlementVM,
} from "@/lib/services/tenant-feature-entitlement.service";

export async function listAdminTenantFeaturesAction(
  kind: "association" | "gym",
  ownerId: string,
): Promise<TenantFeatureEntitlementVM[]> {
  const actor = await requireActor();
  return tenantFeatureEntitlementService.listAdminTenantFeatures(
    actor,
    kind,
    ownerId,
  );
}

export async function setAdminTenantFeatureAction(input: {
  kind: "association" | "gym";
  ownerId: string;
  featureKey: TenantFeatureKey;
  enabled: boolean;
}): Promise<TenantFeatureEntitlementVM[]> {
  const actor = await requireActor();
  return tenantFeatureEntitlementService.setAdminTenantFeature(actor, input);
}
