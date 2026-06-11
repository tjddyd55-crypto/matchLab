import { notFound } from "next/navigation";
import { eventRepository } from "@/lib/repositories/event.repository";

export type EventManagementNavContext = {
  eventId: string;
  title: string;
  publicSlug: string | null;
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
  };
}
