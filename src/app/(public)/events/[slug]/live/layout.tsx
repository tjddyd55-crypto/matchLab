import { notFound } from "next/navigation";
import { SpectatorAccessClosed } from "@/components/domain/events/SpectatorAccessClosed";
import { eventRepository } from "@/lib/repositories/event.repository";
import {
  isSpectatorContentAccessible,
  resolveSpectatorAccessState,
} from "@/lib/spectator-access";
import { eventService } from "@/lib/services/event.service";

export default async function PublicEventLiveLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = await eventRepository.findPublicSpectatorPolicyBySlug(slug);
  if (!policy) notFound();

  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  if (!isSpectatorContentAccessible(policy)) {
    const state = resolveSpectatorAccessState(policy);
    return (
      <SpectatorAccessClosed slug={slug} title={event.title} state={state} />
    );
  }

  return children;
}
