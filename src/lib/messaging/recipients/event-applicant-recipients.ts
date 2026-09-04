import "server-only";

import {
  buildMessagingRecipientCandidate,
  dedupeMessagingRecipients,
  type MessagingRecipientCandidate,
} from "@/lib/messaging/messaging-phone";
import { prisma } from "@/lib/prisma";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";

export async function resolveEventApplicantRecipients(params: {
  eventId: string;
  applicationIds?: string[];
}): Promise<MessagingRecipientCandidate[]> {
  const where = {
    eventId: params.eventId,
    ...(params.applicationIds?.length
      ? { id: { in: params.applicationIds } }
      : {}),
  };

  const rows = await prisma.eventApplication.findMany({
    where,
    select: {
      id: true,
      fighter: {
        select: {
          id: true,
          name: true,
          phone: true,
          guardianPhone: true,
          birthDate: true,
        },
      },
    },
  });

  const candidates = rows.map((row) => {
    const fighter = row.fighter;
    const isMinor = fighter.birthDate
      ? isMinorBirthDate(fighter.birthDate)
      : false;
    const phone = isMinor
      ? fighter.guardianPhone || fighter.phone
      : fighter.phone;
    return buildMessagingRecipientCandidate({
      referenceType: "event_application",
      referenceId: row.id,
      name: fighter.name,
      phone,
    });
  });

  return dedupeMessagingRecipients(candidates);
}
