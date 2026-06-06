import { notFound } from "next/navigation";
import { PublicEventDetailShell } from "@/components/domain/events/public/PublicEventDetailShell";
import { PublicEventLiveSection } from "@/components/domain/events/public/PublicEventLiveSection";
import { eventService } from "@/lib/services/event.service";
import { liveStreamService } from "@/lib/services/live-stream.service";

export const dynamic = "force-dynamic";

export default async function PublicEventLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) notFound();

  const streams = await liveStreamService.listPublicForEventSlug(slug);

  return (
    <PublicEventDetailShell event={event} slug={slug} activeTab="live">
      <PublicEventLiveSection eventTitle={event.title} streams={streams} />
    </PublicEventDetailShell>
  );
}
