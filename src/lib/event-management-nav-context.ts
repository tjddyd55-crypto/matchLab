import { notFound } from "next/navigation";
import type { EventStatus } from "@/lib/enums";
import {
  resolveOrganizerRegistrationStatus,
  type OrganizerRegistrationStatus,
} from "@/lib/event-organizer-status";
import { eventRepository } from "@/lib/repositories/event.repository";

export type EventManagementNavContext = {
  eventId: string;
  title: string;
  publicSlug: string | null;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
};

/** 권한 확인 후 호출 — 대회 미존재 시 404 */
export async function loadEventManagementNavContext(
  eventId: string,
): Promise<EventManagementNavContext> {
  const event = await eventRepository.findOrganizerEventById(eventId);
  if (!event) {
    notFound();
  }
  return {
    eventId: event.id,
    title: event.title,
    publicSlug: event.publicSlug,
    eventStatus: event.status,
    registrationStatus: resolveOrganizerRegistrationStatus({
      status: event.status,
      registrationStartDate: event.registrationStartDate,
      registrationEndDate: event.registrationEndDate,
    }),
  };
}

export function eventManagementLayoutProps(context: EventManagementNavContext) {
  return {
    eventId: context.eventId,
    publicSlug: context.publicSlug,
    eventTitle: context.title,
    eventStatus: context.eventStatus,
    registrationStatus: context.registrationStatus,
  };
}
