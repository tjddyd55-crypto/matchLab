import { notFound } from "next/navigation";
import { PublicEventDetailShell } from "@/components/domain/events/public/PublicEventDetailShell";
import { PublicEventResultsSection } from "@/components/domain/events/public/PublicEventResultsSection";
import { eventService } from "@/lib/services/event.service";
import { resultService } from "@/lib/services/result.service";

export const dynamic = "force-dynamic";

export default async function PublicEventResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  const payload = await resultService.getPublicResultsByEventSlug(slug);
  if (!payload || !event) {
    notFound();
  }

  return (
    <PublicEventDetailShell event={event} slug={slug} activeTab="results">
      <PublicEventResultsSection
        eventId={event.id}
        slug={slug}
        eventTitle={payload.eventTitle}
        results={payload.results}
      />
    </PublicEventDetailShell>
  );
}
