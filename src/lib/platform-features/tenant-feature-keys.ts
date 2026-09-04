/** Platform feature catalog keys — SSOT for entitlement checks */
export const TENANT_FEATURE_KEYS = {
  TENANT_MESSAGING: "TENANT_MESSAGING",
  FACE_ATTENDANCE: "FACE_ATTENDANCE",
} as const;

export type TenantFeatureKey =
  (typeof TENANT_FEATURE_KEYS)[keyof typeof TENANT_FEATURE_KEYS];
