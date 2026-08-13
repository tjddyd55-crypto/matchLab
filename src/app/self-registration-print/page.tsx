import { requireActor } from "@/lib/auth/actor";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { GymMemberSelfRegistrationPrintClient } from "@/components/domain/gym-member-self-registration/GymMemberSelfRegistrationPrintClient";

export const dynamic = "force-dynamic";

/** Dashboard shell 없이 QR 인쇄 용지만 렌더한다. */
export default async function SelfRegistrationPrintPage() {
  const actor = await requireActor();
  if (!actor.gymId) {
    return (
      <main className="p-8 text-center text-sm">체육관 정보가 없습니다.</main>
    );
  }
  const link = await gymMemberSelfRegistrationService.getOrCreateLink(actor);
  return (
    <GymMemberSelfRegistrationPrintClient
      gymName={link.gymName}
      url={link.url}
    />
  );
}
