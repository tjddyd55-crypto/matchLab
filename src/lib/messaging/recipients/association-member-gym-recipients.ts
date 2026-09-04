import "server-only";

import { AssociationMemberGymStatus } from "@/lib/enums";
import {
  buildMessagingRecipientCandidate,
  dedupeMessagingRecipients,
  type MessagingRecipientCandidate,
} from "@/lib/messaging/messaging-phone";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";

export async function resolveAssociationMemberGymRecipients(params: {
  organizerId: string;
  memberGymIds?: string[];
  status?: AssociationMemberGymStatus;
  q?: string;
}): Promise<MessagingRecipientCandidate[]> {
  let rows = await memberGymRepository.listMemberGyms({
    organizerId: params.organizerId,
    status: params.status,
    q: params.q,
  });

  if (params.memberGymIds?.length) {
    const idSet = new Set(params.memberGymIds);
    rows = rows.filter((r) => idSet.has(r.id));
  }

  const candidates = rows.map((row) => {
    const phone =
      row.ownerInvitePhone ||
      row.gym.phone ||
      row.gym.ownerUser?.phone ||
      null;
    const name = row.gym.name;
    return buildMessagingRecipientCandidate({
      referenceType: "association_member_gym",
      referenceId: row.id,
      name,
      phone,
    });
  });

  return dedupeMessagingRecipients(candidates);
}
