import { OrganizerStatus } from "@/generated/prisma";
import { adminMutedTextClass } from "@/lib/ui/admin-ui";

export function AdminOrganizationSuspendedBanner({
  status,
  kind,
}: {
  status: string;
  kind: "association" | "gym";
}) {
  const isSuspended =
    status === OrganizerStatus.suspended || status === "suspended";
  const isArchived =
    status === OrganizerStatus.archived || status === "archived";

  if (!isSuspended && !isArchived) return null;

  const message = isArchived
    ? "운영 종료된 조직입니다."
    : kind === "association"
      ? "현재 이용이 일시정지된 협회입니다. 일부 MATCHON 기능 이용이 제한됩니다."
      : "현재 이용이 일시정지된 체육관입니다. 일부 MATCHON 기능 이용이 제한됩니다.";

  const tone = isArchived
    ? "border-matchon-border bg-matchon-muted/30 text-matchon-text-secondary"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${tone}`} role="status">
      {message}
    </div>
  );
}

export function AdminOrganizationStatusHint({
  status,
}: {
  status: string;
}) {
  if (status === OrganizerStatus.pending || status === "pending") {
    return (
      <p className={`${adminMutedTextClass} text-xs`}>
        가입 승인 전(pending) 상태는 운영 상태 관리 대상이 아닙니다.
      </p>
    );
  }
  if (status === OrganizerStatus.archived || status === "archived") {
    return (
      <p className={`${adminMutedTextClass} text-xs`}>
        보관(archived) 상태는 조회만 가능하며, Phase 2-1에서는 상태 변경 mutation을 제공하지 않습니다.
      </p>
    );
  }
  return null;
}
