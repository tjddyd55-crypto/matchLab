import type { OrganizerPortalAccess } from "@/lib/organizer-portal-access";

export function OrganizerPortalStatusBanner({
  access,
}: {
  access: OrganizerPortalAccess;
}) {
  if (!access.bannerMessage || access.accessMode === "platform_active") {
    return null;
  }
  const tone =
    access.accessMode === "field_operations_only"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-matchon-border bg-matchon-muted/40 text-matchon-text-secondary";

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
      role="status"
    >
      {access.bannerMessage}
    </div>
  );
}
