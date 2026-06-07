"use client";

import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { DrawerPanel } from "@/components/ui/drawer-panel";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";

export function OrganizerOperationDetailDrawer({
  match,
  open,
  onOpenChange,
  mode,
}: {
  match: OrganizerEventMatchListItemVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "result" | "view";
}) {
  if (!match) return null;

  const red = match.fighterRed?.name ?? "미배정";
  const blue = match.fighterBlue?.name ?? "미배정";
  const title = mode === "result" ? "결과 입력" : "결과 보기";

  return (
    <DrawerPanel
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${match.divisionLabel ?? "부문 미상"} · ${red} vs ${blue}`}
      className="sm:max-w-lg"
    >
      <OrganizerMatchOpsPanel {...toMatchOpsProps(match)} />
    </DrawerPanel>
  );
}
