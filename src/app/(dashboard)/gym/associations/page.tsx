import { GymAssociationsClient } from "@/components/domain/gym/GymAssociationsClient";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { associationGymConnectionService } from "@/lib/services/association-gym-connection.service";

export const dynamic = "force-dynamic";

export default async function GymAssociationsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym"]);
  const [{ memberships, requests }, associations] = await Promise.all([
    associationGymConnectionService.listForGym(actor),
    associationGymConnectionService.listJoinableAssociations(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-matchon-text-primary">협회 연결</h1>
        <p className="mt-1 text-sm text-matchon-text-secondary">
          MATCHON 체육관 계정과 협회 소속은 별개입니다. 필요한 협회에만 연결을
          요청하세요.
        </p>
      </div>
      <GymAssociationsClient
        memberships={memberships.map((m) => ({
          id: m.id,
          memberCode: m.memberCode,
          status: m.status,
          joinedAt: m.joinedAt.toISOString(),
          organizer: m.organizer,
        }))}
        requests={requests.map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          associationOrganizer: r.associationOrganizer,
        }))}
        associations={associations}
      />
    </div>
  );
}
