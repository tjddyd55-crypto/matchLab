"use server";

import { MessagingProviderOwnerType } from "@/generated/prisma";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { resolveAssociationMemberGymRecipients } from "@/lib/messaging/recipients/association-member-gym-recipients";
import { resolveEventApplicantRecipients } from "@/lib/messaging/recipients/event-applicant-recipients";
import { resolveGymMemberRecipients } from "@/lib/messaging/recipients/gym-member-recipients";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { eventRepository } from "@/lib/repositories/event.repository";
import { tenantMessagingService } from "@/lib/services/tenant-messaging.service";
import { AssociationMemberGymStatus } from "@/lib/enums";

export async function previewAssociationBulkSmsAction(input: {
  scope: "selected" | "filtered" | "all";
  memberGymIds?: string[];
  status?: string;
  q?: string;
  message: string;
  title?: string;
}) {
  const actor = await requireActor();
  requireAssociationOrganizerPage(actor);
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "협회 정보를 확인할 수 없습니다.");
  }

  const status =
    input.status &&
    Object.values(AssociationMemberGymStatus).includes(
      input.status as AssociationMemberGymStatus,
    )
      ? (input.status as AssociationMemberGymStatus)
      : undefined;

  const recipients = await resolveAssociationMemberGymRecipients({
    organizerId: actor.organizerId,
    memberGymIds:
      input.scope === "selected" ? input.memberGymIds : undefined,
    status: input.scope === "filtered" ? status : undefined,
    q: input.scope === "filtered" ? input.q : undefined,
  });

  return tenantMessagingService.previewBulkMessage({
    owner: { ownerType: "association", organizerId: actor.organizerId },
    recipients,
    message: input.message,
    title: input.title,
  });
}

export async function sendAssociationBulkSmsAction(input: {
  scope: "selected" | "filtered" | "all";
  memberGymIds?: string[];
  status?: string;
  q?: string;
  message: string;
  title?: string;
  idempotencyKey: string;
}) {
  const actor = await requireActor();
  requireAssociationOrganizerPage(actor);
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "협회 정보를 확인할 수 없습니다.");
  }

  const status =
    input.status &&
    Object.values(AssociationMemberGymStatus).includes(
      input.status as AssociationMemberGymStatus,
    )
      ? (input.status as AssociationMemberGymStatus)
      : undefined;

  const recipients = await resolveAssociationMemberGymRecipients({
    organizerId: actor.organizerId,
    memberGymIds:
      input.scope === "selected" ? input.memberGymIds : undefined,
    status: input.scope === "filtered" ? status : undefined,
    q: input.scope === "filtered" ? input.q : undefined,
  });

  return tenantMessagingService.sendBulkMessage({
    actor,
    owner: { ownerType: "association", organizerId: actor.organizerId },
    recipients,
    message: input.message,
    title: input.title,
    idempotencyKey: input.idempotencyKey,
    metadata: { bulkScope: input.scope, audience: "association_member_gym" },
  });
}

export async function previewGymBulkSmsAction(input: {
  scope: "selected" | "filtered";
  memberIds?: string[];
  q?: string;
  status?: string;
  fighterFilter?: string;
  message: string;
  title?: string;
}) {
  const actor = await requireActor();
  const access = await resolveGymPortalAccess(actor);
  if (!access.canWriteMembers && !access.canManageGymSettings) {
    throw new AppError("FORBIDDEN", "회원 문자 발송 권한이 없습니다.");
  }

  const recipients = await resolveGymMemberRecipients({
    gymId: access.gymId,
    memberIds: input.scope === "selected" ? input.memberIds : undefined,
    filters:
      input.scope === "filtered"
        ? {
            q: input.q,
            status: input.status as import("@/lib/enums").GymMemberStatus | undefined,
            fighterFilter: input.fighterFilter as
              | "fighter"
              | "non_fighter"
              | undefined,
          }
        : undefined,
  });

  return tenantMessagingService.previewBulkMessage({
    owner: { ownerType: "gym", gymId: access.gymId },
    recipients,
    message: input.message,
    title: input.title,
  });
}

export async function sendGymBulkSmsAction(input: {
  scope: "selected" | "filtered";
  memberIds?: string[];
  q?: string;
  status?: string;
  fighterFilter?: string;
  message: string;
  title?: string;
  idempotencyKey: string;
}) {
  const actor = await requireActor();
  const access = await resolveGymPortalAccess(actor);
  if (!access.canWriteMembers && !access.canManageGymSettings) {
    throw new AppError("FORBIDDEN", "회원 문자 발송 권한이 없습니다.");
  }

  const recipients = await resolveGymMemberRecipients({
    gymId: access.gymId,
    memberIds: input.scope === "selected" ? input.memberIds : undefined,
    filters:
      input.scope === "filtered"
        ? {
            q: input.q,
            status: input.status as import("@/lib/enums").GymMemberStatus | undefined,
            fighterFilter: input.fighterFilter as
              | "fighter"
              | "non_fighter"
              | undefined,
          }
        : undefined,
  });

  return tenantMessagingService.sendBulkMessage({
    actor,
    owner: { ownerType: "gym", gymId: access.gymId },
    recipients,
    message: input.message,
    title: input.title,
    idempotencyKey: input.idempotencyKey,
    metadata: { bulkScope: input.scope, audience: "gym_member" },
  });
}

export async function previewEventApplicantBulkSmsAction(input: {
  eventId: string;
  applicationIds?: string[];
  message: string;
  title?: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEvent(actor, input.eventId);
  const organizerId = await eventRepository.findEventOrganizerId(input.eventId);
  if (!organizerId) {
    throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
  }

  const recipients = await resolveEventApplicantRecipients({
    eventId: input.eventId,
    applicationIds: input.applicationIds,
  });

  return tenantMessagingService.previewBulkMessage({
    owner: { ownerType: "association", organizerId },
    recipients,
    message: input.message,
    title: input.title,
    metadata: { eventId: input.eventId, audience: "event_applicant" },
  });
}

export async function sendEventApplicantBulkSmsAction(input: {
  eventId: string;
  applicationIds?: string[];
  message: string;
  title?: string;
  idempotencyKey: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEvent(actor, input.eventId);
  const organizerId = await eventRepository.findEventOrganizerId(input.eventId);
  if (!organizerId) {
    throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
  }

  const recipients = await resolveEventApplicantRecipients({
    eventId: input.eventId,
    applicationIds: input.applicationIds,
  });

  return tenantMessagingService.sendBulkMessage({
    actor,
    owner: { ownerType: "association", organizerId },
    recipients,
    message: input.message,
    title: input.title,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      eventId: input.eventId,
      audience: "event_applicant",
      source: "EVENT_APPLICANT",
    },
  });
}
