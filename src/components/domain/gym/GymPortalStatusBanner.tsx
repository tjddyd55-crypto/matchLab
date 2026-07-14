import type { GymPortalAccess } from "@/lib/gym-portal-access";

export function GymPortalStatusBanner({ access }: { access: GymPortalAccess }) {
  if (!access.bannerMessage) return null;
  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      {access.bannerMessage}
    </div>
  );
}
