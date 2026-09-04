"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  setAdminTenantFeatureAction,
} from "@/features/admin-tenant-features/actions";
import type { TenantFeatureEntitlementVM } from "@/lib/services/tenant-feature-entitlement.service";
import type { TenantFeatureKey } from "@/lib/platform-features/tenant-feature-keys";
import { adminMutedTextClass } from "@/lib/ui/admin-ui";

export function AdminTenantFeaturePanel({
  kind,
  ownerId,
  initialFeatures,
}: {
  kind: "association" | "gym";
  ownerId: string;
  initialFeatures: TenantFeatureEntitlementVM[];
}) {
  const router = useRouter();
  const [features, setFeatures] = useState(initialFeatures);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(featureKey: TenantFeatureKey, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const next = await setAdminTenantFeatureAction({
          kind,
          ownerId,
          featureKey,
          enabled,
        });
        setFeatures(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "설정 변경에 실패했습니다.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className={`${adminMutedTextClass} text-sm`}>
        플랫폼 관리자만 변경할 수 있습니다. 협회/체육관 관리자는 credential
        설정만 가능하고, 기능 이용 권한은 여기서 관리합니다.
      </p>

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      <ul className="divide-y rounded-lg border border-matchon-border">
        {features.map((feature) => (
          <li
            key={feature.featureKey}
            className="flex flex-wrap items-start justify-between gap-3 px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{feature.name}</p>
              {feature.description ? (
                <p className={`${adminMutedTextClass} mt-0.5 text-xs`}>
                  {feature.description}
                </p>
              ) : null}
              <p className={`${adminMutedTextClass} mt-1 text-xs`}>
                상태: {feature.enabled ? "활성" : "비활성"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                variant={feature.enabled ? "default" : "outline"}
                disabled={pending || feature.enabled}
                onClick={() => toggle(feature.featureKey as TenantFeatureKey, true)}
              >
                활성
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!feature.enabled ? "default" : "outline"}
                disabled={pending || !feature.enabled}
                onClick={() => toggle(feature.featureKey as TenantFeatureKey, false)}
              >
                비활성
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
