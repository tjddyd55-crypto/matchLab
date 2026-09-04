import "server-only";

import type { GymMemberListFilters } from "@/lib/repositories/gym-member.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import {
  buildMessagingRecipientCandidate,
  dedupeMessagingRecipients,
  type MessagingRecipientCandidate,
} from "@/lib/messaging/messaging-phone";
import { prisma } from "@/lib/prisma";

type MemberPhoneRow = {
  id: string;
  name: string;
  phone: string | null;
  normalizedPhone: string | null;
  smsOptOut: boolean;
};

function mapMemberRow(row: MemberPhoneRow): MessagingRecipientCandidate {
  if (row.smsOptOut) {
    return {
      ...buildMessagingRecipientCandidate({
        referenceType: "gym_member",
        referenceId: row.id,
        name: row.name,
        phone: null,
      }),
      eligible: false,
      excludedReason: "수신 거부",
    };
  }
  return buildMessagingRecipientCandidate({
    referenceType: "gym_member",
    referenceId: row.id,
    name: row.name,
    phone: row.normalizedPhone || row.phone,
  });
}

export async function resolveGymMemberRecipients(params: {
  gymId: string;
  memberIds?: string[];
  filters?: Omit<GymMemberListFilters, "gymId" | "skip" | "take">;
}): Promise<MessagingRecipientCandidate[]> {
  if (params.memberIds?.length) {
    const rows = await prisma.gymMember.findMany({
      where: {
        gymId: params.gymId,
        id: { in: params.memberIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        normalizedPhone: true,
        smsOptOut: true,
      },
    });
    return dedupeMessagingRecipients(rows.map(mapMemberRow));
  }

  const { rows } = await gymMemberRepository.list({
    gymId: params.gymId,
    ...params.filters,
    skip: 0,
    take: 5000,
  });

  if (!rows.length) return [];

  const detailRows = await prisma.gymMember.findMany({
    where: { id: { in: rows.map((r) => r.id) }, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      normalizedPhone: true,
      smsOptOut: true,
    },
  });

  return dedupeMessagingRecipients(detailRows.map(mapMemberRow));
}
